import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: './config/.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),

  DATABASE_URL: z.string().url(),
  DB_POOL_SIZE: z.string().transform(Number).default('20'),

  REDIS_URL: z.string().url(),
  REDIS_TTL: z.string().transform(Number).default('3600'),

  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('gpt-4-turbo-preview'),
  AI_TEMPERATURE: z.string().transform(Number).default('0.7'),
  AI_MAX_TOKENS: z.string().transform(Number).default('2000'),

  TMDB_API_KEY: z.string(),
  TMDB_BASE_URL: z.string().url().default('https://api.themoviedb.org/3'),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('10'),

  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  ALLOWED_ORIGINS: z.string().transform(s => s.split(',')),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),

  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.string().transform(Number).default('1536'),
  SIMILARITY_THRESHOLD: z.string().transform(Number).default('0.7'),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
};

export const config = parseEnv();

export default config;
