/**
 * Core type definitions for Meta-Media-Search platform
 */

export interface MediaItem {
  id: string;
  title: string;
  type: 'movie' | 'tv' | 'documentary' | 'music' | 'podcast' | 'audiobook';
  description: string;
  genres: string[];
  releaseDate: string;
  rating: number;
  thumbnail: string;
  posterUrl: string;
  backdropUrl?: string;
  trailerUrl?: string;
  platforms: Platform[];
  cast?: Cast[];
  director?: string;
  duration?: number;
  seasons?: number;
  episodes?: number;
  embedding?: number[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Platform {
  id: string;
  name: string;
  type: 'streaming' | 'rental' | 'purchase' | 'free';
  url: string;
  price?: number;
  currency?: string;
  quality?: string[];
  available: boolean;
  logo: string;
}

export interface Cast {
  id: string;
  name: string;
  character: string;
  profileUrl?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  preferences: UserPreferences;
  watchHistory: string[];
  favorites: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  genres: string[];
  platforms: string[];
  contentTypes: ('movie' | 'tv' | 'documentary' | 'music' | 'podcast')[];
  languages: string[];
  minRating?: number;
  excludeMature?: boolean;
}

export interface SearchQuery {
  query: string;
  userId?: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  type?: MediaItem['type'][];
  genres?: string[];
  platforms?: string[];
  minRating?: number;
  releaseYearMin?: number;
  releaseYearMax?: number;
  language?: string;
}

export interface SearchResult {
  items: MediaItem[];
  total: number;
  query: string;
  processingTime: number;
  suggestions?: string[];
  visualMap?: VisualMapNode[];
}

export interface VisualMapNode {
  id: string;
  title: string;
  type: MediaItem['type'];
  thumbnail: string;
  relevanceScore: number;
  position: { x: number; y: number };
  connections: string[];
  metadata: Record<string, any>;
}

export interface RecommendationRequest {
  userId: string;
  basedOn?: string[];
  limit?: number;
  diversityFactor?: number;
}

export interface RecommendationResult {
  items: MediaItem[];
  reasoning: string;
  confidence: number;
  factors: {
    genreMatch: number;
    platformAvailability: number;
    ratingAlignment: number;
    contentSimilarity: number;
  };
}

export interface AIQuery {
  userQuery: string;
  context?: {
    userId?: string;
    previousSearches?: string[];
    preferences?: UserPreferences;
  };
}

export interface AIResponse {
  interpretation: string;
  extractedFilters: SearchFilters;
  suggestedPlatforms?: string[];
  confidence: number;
  needsClarification: boolean;
  clarificationQuestions?: string[];
}

export interface CacheEntry<T> {
  key: string;
  data: T;
  ttl: number;
  createdAt: number;
}

export interface APIError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
