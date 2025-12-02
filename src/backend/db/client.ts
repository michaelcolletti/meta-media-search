import pg from 'pg';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { DatabaseError } from '../utils/errors.js';

const { Pool } = pg;

class DatabaseClient {
  private pool: pg.Pool;
  private isConnected = false;

  constructor() {
    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: config.DB_POOL_SIZE,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.pool.on('connect', () => {
      logger.info('New database connection established');
    });

    this.pool.on('error', err => {
      logger.error({ err }, 'Unexpected database pool error');
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error({ err: error }, 'Database connection failed');
      throw new DatabaseError('Failed to connect to database');
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      logger.debug(
        {
          query: text,
          duration,
          rows: result.rowCount,
        },
        'Database query executed'
      );

      return result;
    } catch (error) {
      logger.error(
        {
          err: error,
          query: text,
          params,
        },
        'Database query error'
      );
      throw new DatabaseError('Query execution failed');
    }
  }

  async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ err: error }, 'Transaction failed and rolled back');
      throw error;
    } finally {
      client.release();
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    logger.info('Database disconnected');
  }

  getPool(): pg.Pool {
    return this.pool;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

export default new DatabaseClient();
