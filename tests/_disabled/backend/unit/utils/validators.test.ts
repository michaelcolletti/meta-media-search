import { describe, it, expect } from 'vitest';
import {
  searchQuerySchema,
  recommendationRequestSchema,
  userPreferencesSchema,
  userRegistrationSchema,
} from '../../../../src/backend/utils/validators.js';
import { ZodError } from 'zod';

describe('Validators', () => {
  describe('searchQuerySchema', () => {
    it('should validate valid search query', () => {
      const valid = {
        query: 'action movies',
        limit: 20,
        offset: 0,
      };

      const result = searchQuerySchema.parse(valid);
      expect(result).toMatchObject(valid);
    });

    it('should apply default values', () => {
      const minimal = { query: 'test' };
      const result = searchQuerySchema.parse(minimal);

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should reject empty query', () => {
      expect(() => {
        searchQuerySchema.parse({ query: '' });
      }).toThrow(ZodError);
    });

    it('should reject query over 500 characters', () => {
      expect(() => {
        searchQuerySchema.parse({ query: 'a'.repeat(501) });
      }).toThrow(ZodError);
    });

    it('should validate filters', () => {
      const withFilters = {
        query: 'test',
        filters: {
          type: ['movie', 'tv'],
          genres: ['action', 'drama'],
          minRating: 7.5,
          releaseYearMin: 2020,
          releaseYearMax: 2024,
        },
      };

      const result = searchQuerySchema.parse(withFilters);
      expect(result.filters).toMatchObject(withFilters.filters);
    });
  });

  describe('recommendationRequestSchema', () => {
    it('should validate valid recommendation request', () => {
      const valid = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        limit: 10,
        diversityFactor: 0.5,
      };

      const result = recommendationRequestSchema.parse(valid);
      expect(result).toMatchObject(valid);
    });

    it('should reject invalid UUID', () => {
      expect(() => {
        recommendationRequestSchema.parse({
          userId: 'invalid-uuid',
        });
      }).toThrow(ZodError);
    });

    it('should validate basedOn array', () => {
      const valid = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        basedOn: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
      };

      const result = recommendationRequestSchema.parse(valid);
      expect(result.basedOn).toEqual(valid.basedOn);
    });
  });

  describe('userPreferencesSchema', () => {
    it('should validate user preferences', () => {
      const valid = {
        genres: ['action', 'sci-fi'],
        platforms: ['netflix', 'hulu'],
        contentTypes: ['movie', 'tv'],
        languages: ['en', 'es'],
        minRating: 7.0,
        excludeMature: true,
      };

      const result = userPreferencesSchema.parse(valid);
      expect(result).toMatchObject(valid);
    });

    it('should apply default values', () => {
      const result = userPreferencesSchema.parse({});

      expect(result.genres).toEqual([]);
      expect(result.platforms).toEqual([]);
      expect(result.contentTypes).toEqual([]);
      expect(result.languages).toEqual(['en']);
      expect(result.excludeMature).toBe(false);
    });
  });

  describe('userRegistrationSchema', () => {
    it('should validate valid registration', () => {
      const valid = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      const result = userRegistrationSchema.parse(valid);
      expect(result).toMatchObject(valid);
    });

    it('should reject invalid email', () => {
      expect(() => {
        userRegistrationSchema.parse({
          email: 'invalid-email',
          password: 'SecurePass123!',
          name: 'Test User',
        });
      }).toThrow(ZodError);
    });

    it('should reject short password', () => {
      expect(() => {
        userRegistrationSchema.parse({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User',
        });
      }).toThrow(ZodError);
    });

    it('should reject short name', () => {
      expect(() => {
        userRegistrationSchema.parse({
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'T',
        });
      }).toThrow(ZodError);
    });
  });
});
