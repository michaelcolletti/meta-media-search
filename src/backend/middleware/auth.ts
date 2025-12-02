import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { AuthenticationError } from '../utils/errors.js';
import { asyncHandler } from './errorHandler.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticate = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No valid authentication token provided');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as {
        id: string;
        email: string;
      };

      req.user = {
        id: decoded.id,
        email: decoded.email,
      };

      next();
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  }
);

export const optionalAuth = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as {
          id: string;
          email: string;
        };

        req.user = {
          id: decoded.id,
          email: decoded.email,
        };
      } catch (error) {
        // Token invalid but optional, continue without user
      }
    }

    next();
  }
);

export const generateToken = (payload: { id: string; email: string }): string => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};
