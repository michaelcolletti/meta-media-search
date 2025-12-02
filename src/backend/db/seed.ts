import db from './client.js';
import logger from '../utils/logger.js';

const seedPlatforms = [
  {
    id: 'netflix',
    name: 'Netflix',
    type: 'streaming',
    logo: 'https://cdn.example.com/netflix.png',
  },
  { id: 'hulu', name: 'Hulu', type: 'streaming', logo: 'https://cdn.example.com/hulu.png' },
  {
    id: 'disney-plus',
    name: 'Disney+',
    type: 'streaming',
    logo: 'https://cdn.example.com/disney.png',
  },
  { id: 'hbo-max', name: 'HBO Max', type: 'streaming', logo: 'https://cdn.example.com/hbo.png' },
  {
    id: 'prime-video',
    name: 'Prime Video',
    type: 'streaming',
    logo: 'https://cdn.example.com/prime.png',
  },
  {
    id: 'apple-tv',
    name: 'Apple TV+',
    type: 'streaming',
    logo: 'https://cdn.example.com/apple.png',
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    type: 'streaming',
    logo: 'https://cdn.example.com/paramount.png',
  },
  {
    id: 'peacock',
    name: 'Peacock',
    type: 'streaming',
    logo: 'https://cdn.example.com/peacock.png',
  },
];

async function seedDatabase() {
  try {
    await db.connect();
    logger.info('Starting database seeding');

    // Seed platforms
    logger.info('Seeding platforms');
    for (const platform of seedPlatforms) {
      await db.query(
        `INSERT INTO platforms (id, name, type, logo, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [platform.id, platform.name, platform.type, platform.logo, JSON.stringify({})]
      );
    }

    logger.info({ count: seedPlatforms.length }, 'Platforms seeded');

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error({ err: error }, 'Database seeding failed');
    throw error;
  } finally {
    await db.disconnect();
  }
}

// Run seeding from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedDatabase;
