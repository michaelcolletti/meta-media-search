import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './client.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  id: string;
  name: string;
  file: string;
}

const migrations: Migration[] = [
  {
    id: '001',
    name: 'Initial schema',
    file: '001_initial_schema.sql',
  },
];

class MigrationRunner {
  async createMigrationsTable(): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getExecutedMigrations(): Promise<Set<string>> {
    const result = await db.query<{ id: string }>(
      'SELECT id FROM migrations ORDER BY executed_at ASC'
    );

    return new Set(result.rows.map(row => row.id));
  }

  async executeMigration(migration: Migration): Promise<void> {
    const filePath = join(__dirname, 'migrations', migration.file);
    const sql = readFileSync(filePath, 'utf-8');

    logger.info({ migration: migration.name }, 'Executing migration');

    await db.transaction(async client => {
      // Execute migration SQL
      await client.query(sql);

      // Record migration
      await client.query('INSERT INTO migrations (id, name) VALUES ($1, $2)', [
        migration.id,
        migration.name,
      ]);
    });

    logger.info({ migration: migration.name }, 'Migration completed');
  }

  async rollbackMigration(migration: Migration): Promise<void> {
    logger.info({ migration: migration.name }, 'Rolling back migration');

    await db.transaction(async client => {
      // Delete migration record
      await client.query('DELETE FROM migrations WHERE id = $1', [migration.id]);
    });

    logger.info({ migration: migration.name }, 'Rollback completed');
  }

  async migrate(): Promise<void> {
    try {
      await db.connect();
      await this.createMigrationsTable();

      const executed = await this.getExecutedMigrations();
      const pending = migrations.filter(m => !executed.has(m.id));

      if (pending.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info({ count: pending.length }, 'Running pending migrations');

      for (const migration of pending) {
        await this.executeMigration(migration);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error({ err: error }, 'Migration failed');
      throw error;
    } finally {
      await db.disconnect();
    }
  }

  async rollback(): Promise<void> {
    try {
      await db.connect();
      await this.createMigrationsTable();

      const executed = await this.getExecutedMigrations();
      const lastMigration = migrations
        .filter(m => executed.has(m.id))
        .sort((a, b) => b.id.localeCompare(a.id))[0];

      if (!lastMigration) {
        logger.info('No migrations to rollback');
        return;
      }

      await this.rollbackMigration(lastMigration);
      logger.info('Rollback completed successfully');
    } catch (error) {
      logger.error({ err: error }, 'Rollback failed');
      throw error;
    } finally {
      await db.disconnect();
    }
  }
}

// Run migrations from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new MigrationRunner();
  const isRollback = process.argv.includes('--rollback');

  (isRollback ? runner.rollback() : runner.migrate())
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default MigrationRunner;
