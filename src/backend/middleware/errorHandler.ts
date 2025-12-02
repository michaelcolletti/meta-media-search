import { Request, Response, NextFunction } from 'express';
import { AppError, isOperationalError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { ZodError } from 'zod';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error({
    err: error,
    req: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
    },
  }, 'Request error');

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      statusCode: 400,
      details: error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  // Handle known application errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    });
  }

  // Handle unknown errors
  const statusCode = 500;
  const message = isOperationalError(error)
    ? error.message
    : 'An unexpected error occurred';

  res.status(statusCode).json({
    code: 'INTERNAL_SERVER_ERROR',
    message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
