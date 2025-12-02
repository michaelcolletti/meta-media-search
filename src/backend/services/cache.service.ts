import Redis from 'ioredis';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { CacheEntry } from '@types/index.js';

class CacheService {
  private client: Redis;
  private readonly defaultTTL: number;

  constructor() {
    this.client = new Redis(config.REDIS_URL, {
      retryStrategy: times => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.defaultTTL = config.REDIS_TTL;

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.client.on('error', error => {
      logger.error({ err: error }, 'Redis connection error');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;

      const parsed = JSON.parse(data) as CacheEntry<T>;
      return parsed.data;
    } catch (error) {
      logger.error({ err: error, key }, 'Cache get error');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        key,
        data: value,
        ttl,
        createdAt: Date.now(),
      };

      await this.client.setex(key, ttl, JSON.stringify(entry));
      logger.debug({ key, ttl }, 'Cache set successful');
    } catch (error) {
      logger.error({ err: error, key }, 'Cache set error');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
      logger.debug({ key }, 'Cache delete successful');
    } catch (error) {
      logger.error({ err: error, key }, 'Cache delete error');
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        logger.debug({ pattern, count: keys.length }, 'Cache pattern delete successful');
      }
    } catch (error) {
      logger.error({ err: error, pattern }, 'Cache pattern delete error');
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error({ err: error, key }, 'Cache exists check error');
      return false;
    }
  }

  async flush(): Promise<void> {
    try {
      await this.client.flushall();
      logger.info('Cache flushed successfully');
    } catch (error) {
      logger.error({ err: error }, 'Cache flush error');
    }
  }

  generateKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    logger.info('Redis disconnected');
  }
}

export default new CacheService();
