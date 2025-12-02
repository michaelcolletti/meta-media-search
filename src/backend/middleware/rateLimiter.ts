import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import { RateLimitError } from '../utils/errors.js';

export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options?.windowMs || config.RATE_LIMIT_WINDOW_MS,
    max: options?.max || config.RATE_LIMIT_MAX_REQUESTS,
    message: options?.message || 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      throw new RateLimitError(options?.message);
    },
  });
};

export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many search requests, please try again later',
});

export const recommendationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many recommendation requests, please try again later',
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later',
});
