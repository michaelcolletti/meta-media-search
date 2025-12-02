import { APIError } from '@types/index.js';

export class AppError extends Error implements APIError {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(
      'NOT_FOUND',
      `${resource}${identifier ? ` with identifier ${identifier}` : ''} not found`,
      404
    );
    this.name = 'NotFoundError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super('AUTHENTICATION_ERROR', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('AUTHORIZATION_ERROR', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super('RATE_LIMIT_ERROR', message, 429);
    this.name = 'RateLimitError';
  }
}

export class ExternalAPIError extends AppError {
  constructor(service: string, message: string, details?: Record<string, any>) {
    super('EXTERNAL_API_ERROR', `${service}: ${message}`, 502, details);
    this.name = 'ExternalAPIError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('DATABASE_ERROR', message, 500, details);
    this.name = 'DatabaseError';
  }
}

export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return true;
  }
  return false;
};
