import aiService from './ai.service.js';
import tmdbService from './tmdb.service.js';
import cacheService from './cache.service.js';
import mediaModel from '../models/media.model.js';
import { SearchQuery, SearchResult, SearchFilters, VisualMapNode, MediaItem } from '@types/index.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

class SearchService {
  async search(searchQuery: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = cacheService.generateKey(
        'search',
        searchQuery.query,
        JSON.stringify(searchQuery.filters),
        searchQuery.userId || 'anon'
      );

      const cached = await cacheService.get<SearchResult>(cacheKey);
      if (cached) {
        logger.info({ query: searchQuery.query, cached: true }, 'Search cache hit');
        return cached;
      }

      // Process natural language query with AI
      const aiResponse = await aiService.processNaturalLanguageQuery({
        userQuery: searchQuery.query,
        context: searchQuery.userId ? await this.getUserContext(searchQuery.userId) : undefined,
      });

      // Merge AI-extracted filters with user-provided filters
      const mergedFilters: SearchFilters = {
        ...aiResponse.extractedFilters,
        ...searchQuery.filters,
      };

      // Search in local database
      const dbResults = await mediaModel.search(mergedFilters, {
        page: Math.floor((searchQuery.offset || 0) / (searchQuery.limit || 20)) + 1,
        limit: searchQuery.limit || 20,
        sortBy: 'rating',
        sortOrder: 'desc',
      });

      let items = dbResults.items;

      // If not enough results, fetch from TMDB
      if (items.length < (searchQuery.limit || 20)) {
        const tmdbResults = await tmdbService.searchMulti(searchQuery.query);

        // Store TMDB results in database for future searches
        for (const item of tmdbResults) {
          try {
            // Generate and store embeddings
            const embeddingText = `${item.title} ${item.description} ${item.genres?.join(' ')}`;
            const embedding = await aiService.generateEmbedding(embeddingText);

            await mediaModel.create({
              ...item,
              embedding,
            });
          } catch (error) {
            logger.warn({ err: error, itemId: item.id }, 'Failed to store media item');
          }
        }

        // Combine results, prioritizing local DB results
        const existingIds = new Set(items.map(i => i.id));
        const newItems = tmdbResults.filter(i => !existingIds.has(i.id));
        items = [...items, ...newItems].slice(0, searchQuery.limit || 20);
      }

      // Generate semantic similarity rankings if we have embeddings
      if (items.length > 0) {
        const queryEmbedding = await aiService.generateEmbedding(searchQuery.query);
        const similarItems = await mediaModel.searchBySimilarity(
          queryEmbedding,
          Math.min(50, (searchQuery.limit || 20) * 2)
        );

        // Merge and re-rank results
        items = this.mergeAndRankResults(items, similarItems, queryEmbedding);
      }

      // Generate visual map data
      const visualMap = await this.generateVisualMap(items);

      const result: SearchResult = {
        items: items.slice(0, searchQuery.limit || 20),
        total: dbResults.total,
        query: searchQuery.query,
        processingTime: Date.now() - startTime,
        suggestions: this.generateSuggestions(aiResponse, items),
        visualMap,
      };

      // Cache the results
      await cacheService.set(cacheKey, result, 1800); // 30 minutes

      logger.info({
        query: searchQuery.query,
        resultsCount: result.items.length,
        processingTime: result.processingTime,
      }, 'Search completed');

      return result;
    } catch (error) {
      logger.error({ err: error, query: searchQuery }, 'Search error');
      throw error;
    }
  }

  async discover(userId?: string, limit = 20): Promise<MediaItem[]> {
    try {
      const cacheKey = cacheService.generateKey('discover', userId || 'anon', limit);
      const cached = await cacheService.get<MediaItem[]>(cacheKey);

      if (cached) return cached;

      let items: MediaItem[];

      if (userId) {
        // Personalized discovery based on user preferences
        const context = await this.getUserContext(userId);

        items = await mediaModel.search(
          {
            genres: context.preferences?.genres,
            minRating: context.preferences?.minRating || 7.0,
          },
          { page: 1, limit, sortBy: 'created_at', sortOrder: 'desc' }
        ).then(result => result.items);
      } else {
        // Generic trending content
        items = await mediaModel.getTrending(limit);
      }

      await cacheService.set(cacheKey, items, 1800); // 30 minutes
      return items;
    } catch (error) {
      logger.error({ err: error, userId }, 'Discovery error');
      throw error;
    }
  }

  private async getUserContext(userId: string) {
    // This would fetch from user model in a real implementation
    return {
      userId,
      preferences: {
        genres: [],
        platforms: [],
        contentTypes: [],
        languages: ['en'],
      } as any,
      previousSearches: [],
    };
  }

  private mergeAndRankResults(
    textResults: MediaItem[],
    semanticResults: MediaItem[],
    queryEmbedding: number[]
  ): MediaItem[] {
    const itemMap = new Map<string, MediaItem & { score: number }>();

    // Add text search results with base score
    textResults.forEach((item, index) => {
      itemMap.set(item.id, {
        ...item,
        score: 1.0 - (index / textResults.length) * 0.5, // 0.5 to 1.0
      });
    });

    // Boost scores with semantic similarity
    semanticResults.forEach((item, index) => {
      const existing = itemMap.get(item.id);
      const semanticScore = 1.0 - (index / semanticResults.length) * 0.5;

      if (existing) {
        existing.score = existing.score * 0.6 + semanticScore * 0.4; // Weighted average
      } else {
        itemMap.set(item.id, {
          ...item,
          score: semanticScore * 0.7, // Lower weight for semantic-only matches
        });
      }
    });

    // Sort by combined score
    return Array.from(itemMap.values())
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...item }) => item);
  }

  private async generateVisualMap(items: MediaItem[]): Promise<VisualMapNode[]> {
    if (items.length === 0) return [];

    const nodes: VisualMapNode[] = [];
    const genres = new Map<string, MediaItem[]>();

    // Group by genres for positioning
    items.forEach(item => {
      item.genres?.forEach(genre => {
        if (!genres.has(genre)) {
          genres.set(genre, []);
        }
        genres.get(genre)!.push(item);
      });
    });

    // Generate positions in a circular layout
    const angleStep = (2 * Math.PI) / items.length;

    items.forEach((item, index) => {
      const angle = angleStep * index;
      const radius = 100;

      nodes.push({
        id: item.id,
        title: item.title,
        type: item.type,
        thumbnail: item.thumbnail,
        relevanceScore: 1.0 - (index / items.length),
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        },
        connections: this.findConnections(item, items),
        metadata: {
          genres: item.genres,
          rating: item.rating,
          year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : null,
        },
      });
    });

    return nodes;
  }

  private findConnections(item: MediaItem, allItems: MediaItem[]): string[] {
    const connections: string[] = [];

    // Find items with shared genres
    allItems.forEach(other => {
      if (other.id === item.id) return;

      const sharedGenres = item.genres?.filter(g => other.genres?.includes(g)) || [];
      if (sharedGenres.length >= 2) {
        connections.push(other.id);
      }
    });

    return connections.slice(0, 5); // Limit to 5 connections
  }

  private generateSuggestions(aiResponse: any, items: MediaItem[]): string[] {
    const suggestions: string[] = [];

    // Extract unique genres from results
    const genres = new Set<string>();
    items.forEach(item => item.genres?.forEach(g => genres.add(g)));

    // Generate genre-based suggestions
    Array.from(genres).slice(0, 3).forEach(genre => {
      suggestions.push(`${genre} movies`);
    });

    // Add platform-based suggestions
    if (aiResponse.suggestedPlatforms?.length > 0) {
      suggestions.push(`Available on ${aiResponse.suggestedPlatforms[0]}`);
    }

    return suggestions.slice(0, 5);
  }
}

export default new SearchService();
