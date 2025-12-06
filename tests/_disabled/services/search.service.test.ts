import { describe, it, expect, vi, beforeEach } from 'vitest';
import searchService from '../../../../src/backend/services/search.service.js';
import aiService from '../../../../src/backend/services/ai.service.js';
import mediaModel from '../../../../src/backend/models/media.model.js';
import cacheService from '../../../../src/backend/services/cache.service.js';

vi.mock('../../../../src/backend/services/ai.service.js');
vi.mock('../../../../src/backend/models/media.model.js');
vi.mock('../../../../src/backend/services/cache.service.js');
vi.mock('../../../../src/backend/services/tmdb.service.js');

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should return search results from cache if available', async () => {
      const mockCachedResult = {
        items: [],
        total: 0,
        query: 'test query',
        processingTime: 100,
        suggestions: [],
        visualMap: [],
      };

      vi.mocked(cacheService.get).mockResolvedValue(mockCachedResult);

      const result = await searchService.search({
        query: 'test query',
        limit: 20,
        offset: 0,
      });

      expect(result).toEqual(mockCachedResult);
      expect(cacheService.get).toHaveBeenCalled();
    });

    it('should process natural language query with AI', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(aiService.processNaturalLanguageQuery).mockResolvedValue({
        interpretation: 'Looking for action movies',
        extractedFilters: {
          type: ['movie'],
          genres: ['action'],
        },
        suggestedPlatforms: ['netflix'],
        confidence: 0.9,
        needsClarification: false,
      });

      vi.mocked(mediaModel.search).mockResolvedValue({
        items: [],
        total: 0,
      });

      vi.mocked(aiService.generateEmbedding).mockResolvedValue([]);

      await searchService.search({
        query: 'action movies',
        limit: 20,
        offset: 0,
      });

      expect(aiService.processNaturalLanguageQuery).toHaveBeenCalledWith({
        userQuery: 'action movies',
        context: undefined,
      });
    });

    it('should merge AI filters with user filters', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(aiService.processNaturalLanguageQuery).mockResolvedValue({
        interpretation: 'Looking for action movies',
        extractedFilters: {
          type: ['movie'],
          genres: ['action'],
        },
        confidence: 0.9,
        needsClarification: false,
      });

      vi.mocked(mediaModel.search).mockResolvedValue({
        items: [],
        total: 0,
      });

      vi.mocked(aiService.generateEmbedding).mockResolvedValue([]);

      await searchService.search({
        query: 'action movies',
        filters: {
          minRating: 8.0,
        },
        limit: 20,
        offset: 0,
      });

      expect(mediaModel.search).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ['movie'],
          genres: ['action'],
          minRating: 8.0,
        }),
        expect.any(Object)
      );
    });
  });

  describe('discover', () => {
    it('should return trending content for anonymous users', async () => {
      const mockTrending = [
        { id: '1', title: 'Movie 1', type: 'movie' as const },
        { id: '2', title: 'Movie 2', type: 'movie' as const },
      ];

      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(mediaModel.getTrending).mockResolvedValue(mockTrending as any);

      const result = await searchService.discover(undefined, 20);

      expect(result).toEqual(mockTrending);
      expect(mediaModel.getTrending).toHaveBeenCalledWith(20);
    });
  });
});
