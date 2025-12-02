import { z } from 'zod';
import {
  SearchQuery,
  SearchFilters,
  RecommendationRequest,
  UserPreferences,
} from '@types/index.js';

export const searchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  userId: z.string().uuid().optional(),
  filters: z
    .object({
      type: z
        .array(z.enum(['movie', 'tv', 'documentary', 'music', 'podcast', 'audiobook']))
        .optional(),
      genres: z.array(z.string()).optional(),
      platforms: z.array(z.string()).optional(),
      minRating: z.number().min(0).max(10).optional(),
      releaseYearMin: z.number().min(1900).max(new Date().getFullYear()).optional(),
      releaseYearMax: z
        .number()
        .min(1900)
        .max(new Date().getFullYear() + 5)
        .optional(),
      language: z.string().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const recommendationRequestSchema = z.object({
  userId: z.string().uuid(),
  basedOn: z.array(z.string().uuid()).optional(),
  limit: z.number().min(1).max(50).default(10),
  diversityFactor: z.number().min(0).max(1).default(0.3),
});

export const userPreferencesSchema = z.object({
  genres: z.array(z.string()).default([]),
  platforms: z.array(z.string()).default([]),
  contentTypes: z.array(z.enum(['movie', 'tv', 'documentary', 'music', 'podcast'])).default([]),
  languages: z.array(z.string()).default(['en']),
  minRating: z.number().min(0).max(10).optional(),
  excludeMature: z.boolean().default(false),
});

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const userRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100),
});

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type ValidatedSearchQuery = z.infer<typeof searchQuerySchema>;
export type ValidatedRecommendationRequest = z.infer<typeof recommendationRequestSchema>;
export type ValidatedUserPreferences = z.infer<typeof userPreferencesSchema>;
export type ValidatedPagination = z.infer<typeof paginationSchema>;
