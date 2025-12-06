/**
 * Vector Search Service
 * Hybrid search combining keyword and semantic vector search
 */

import RuVectorClient from '../../vector-db/ruvector-client.js';
import embeddingService from '../../vector-db/embedding-service.js';
import mediaModel from '../models/media.model.js';
import cacheService from './cache.service.js';
import logger from '../utils/logger.js';
import { MediaItem, SearchFilters } from '@types/index.js';

interface VectorSearchOptions {
  limit?: number;
  offset?: number;
  scoreThreshold?: number;
  filters?: SearchFilters;
  hybridWeight?: number; // 0 = pure keyword, 1 = pure semantic
}

interface VectorSearchResult {
  items: MediaItem[];
  total: number;
  semanticScore: number;
  keywordScore: number;
  hybridScore: number;
  processingTime: number;
}

interface SimilarContentOptions {
  mediaId: string;
  limit?: number;
  excludeWatched?: boolean;
  userId?: string;
}

/**
 * Advanced vector search service with hybrid capabilities
 */
class VectorSearchService {
  private vectorClient: RuVectorClient;
  private mediaCollection = 'media_embeddings';

  constructor() {
    this.vectorClient = new RuVectorClient({
      defaultCollection: this.mediaCollection,
      dimensions: 1536,
    });
  }

  /**
   * Initialize vector search service
   */
  async initialize(): Promise<void> {
    try {
      await this.vectorClient.connect();

      // Create media embeddings collection
      await this.vectorClient.createCollection(this.mediaCollection, {
        dimensions: 1536,
        indexType: 'hnsw',
        distance: 'cosine',
      });

      logger.info('Vector search service initialized');
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize vector search service');
      throw error;
    }
  }

  /**
   * Hybrid search combining keyword and semantic search
   */
  async hybridSearch(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult> {
    try {
      const startTime = Date.now();
      const limit = options.limit || 20;
      const hybridWeight = options.hybridWeight || 0.5;

      // Check cache
      const cacheKey = cacheService.generateKey(
        'vector_search',
        query,
        JSON.stringify(options)
      );
      const cached = await cacheService.get<VectorSearchResult>(cacheKey);

      if (cached) {
        logger.debug({ query, cached: true }, 'Vector search cache hit');
        return cached;
      }

      // Perform keyword search
      const keywordResults = await this.keywordSearch(query, options);

      // Perform semantic search
      const semanticResults = await this.semanticSearch(query, options);

      // Combine results with hybrid scoring
      const hybridResults = this.combineResults(
        keywordResults,
        semanticResults,
        hybridWeight,
        limit
      );

      const processingTime = Date.now() - startTime;

      const result: VectorSearchResult = {
        items: hybridResults,
        total: hybridResults.length,
        semanticScore: this.calculateAverageRelevance(semanticResults),
        keywordScore: this.calculateAverageRelevance(keywordResults),
        hybridScore: this.calculateAverageRelevance(hybridResults),
        processingTime,
      };

      // Cache results
      await cacheService.set(cacheKey, result, 1800); // 30 minutes

      logger.info(
        {
          query,
          resultsCount: result.total,
          processingTime,
          hybridWeight,
        },
        'Hybrid search completed'
      );

      return result;
    } catch (error) {
      logger.error({ err: error, query }, 'Hybrid search failed');
      throw error;
    }
  }

  /**
   * Pure semantic search using vector similarity
   */
  async semanticSearch(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<Array<MediaItem & { relevanceScore: number }>> {
    try {
      const limit = options.limit || 20;
      const scoreThreshold = options.scoreThreshold || 0.7;

      // Generate embedding for query
      const { embedding } = await embeddingService.generateEmbedding(query);

      // Search in vector database
      const vectorResults = await this.vectorClient.search(this.mediaCollection, embedding, {
        limit: limit * 2, // Get more results for filtering
        scoreThreshold,
        filter: this.buildMetadataFilter(options.filters),
      });

      // Convert vector results to media items
      const mediaItems: Array<MediaItem & { relevanceScore: number }> = [];

      for (const result of vectorResults) {
        const media = await mediaModel.findById(result.id);

        if (media) {
          mediaItems.push({
            ...media,
            relevanceScore: result.score,
          });
        }
      }

      // Apply additional filters
      const filteredItems = this.applyFilters(mediaItems, options.filters);

      logger.debug(
        {
          query,
          vectorResults: vectorResults.length,
          filteredResults: filteredItems.length,
        },
        'Semantic search completed'
      );

      return filteredItems.slice(0, limit);
    } catch (error) {
      logger.error({ err: error, query }, 'Semantic search failed');
      throw error;
    }
  }

  /**
   * Keyword search using traditional text matching
   */
  async keywordSearch(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<Array<MediaItem & { relevanceScore: number }>> {
    try {
      const limit = options.limit || 20;

      // Perform keyword search in database
      const dbResults = await mediaModel.search(options.filters || {}, {
        page: 1,
        limit: limit * 2,
        sortBy: 'rating',
        sortOrder: 'desc',
      });

      // Calculate keyword relevance scores
      const queryTerms = this.tokenizeQuery(query);

      const scoredItems = dbResults.items.map(item => {
        const relevanceScore = this.calculateKeywordRelevance(item, queryTerms);

        return {
          ...item,
          relevanceScore,
        };
      });

      // Sort by relevance
      scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return scoredItems.slice(0, limit);
    } catch (error) {
      logger.error({ err: error, query }, 'Keyword search failed');
      throw error;
    }
  }

  /**
   * Find similar content based on media item
   */
  async findSimilarContent(options: SimilarContentOptions): Promise<MediaItem[]> {
    try {
      const { mediaId, limit = 10, excludeWatched = false, userId } = options;

      // Get source media
      const sourceMedia = await mediaModel.findById(mediaId);

      if (!sourceMedia || !sourceMedia.embedding) {
        throw new Error('Source media not found or has no embedding');
      }

      // Search for similar vectors
      const similarResults = await this.vectorClient.search(
        this.mediaCollection,
        sourceMedia.embedding,
        {
          limit: limit + 1, // +1 to account for the source item itself
          scoreThreshold: 0.7,
        }
      );

      // Filter out the source item
      const filteredResults = similarResults.filter(r => r.id !== mediaId);

      // Convert to media items
      const similarMedia: MediaItem[] = [];

      for (const result of filteredResults.slice(0, limit)) {
        const media = await mediaModel.findById(result.id);

        if (media) {
          similarMedia.push(media);
        }
      }

      // Exclude watched content if requested
      if (excludeWatched && userId) {
        const watchHistory = await this.getUserWatchHistory(userId);
        return similarMedia.filter(item => !watchHistory.includes(item.id));
      }

      logger.info(
        {
          sourceMediaId: mediaId,
          similarCount: similarMedia.length,
        },
        'Similar content found'
      );

      return similarMedia;
    } catch (error) {
      logger.error({ err: error, options }, 'Failed to find similar content');
      throw error;
    }
  }

  /**
   * Index media item embeddings
   */
  async indexMedia(media: MediaItem | MediaItem[]): Promise<void> {
    try {
      const mediaArray = Array.isArray(media) ? media : [media];

      // Generate embeddings for media items
      const embeddingMap = await embeddingService.generateMediaEmbeddingsBatch(mediaArray);

      // Prepare documents for vector database
      const documents = mediaArray.map(item => ({
        id: item.id,
        vector: embeddingMap.get(item.id) || [],
        metadata: {
          type: item.type,
          genres: item.genres,
          rating: item.rating,
          releaseDate: item.releaseDate,
        },
      }));

      // Upsert to vector database
      await this.vectorClient.upsert(this.mediaCollection, documents);

      logger.info(
        { mediaCount: mediaArray.length },
        'Media embeddings indexed'
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to index media');
      throw error;
    }
  }

  /**
   * Remove media from vector index
   */
  async removeFromIndex(mediaId: string): Promise<void> {
    try {
      await this.vectorClient.delete(this.mediaCollection, mediaId);

      logger.debug({ mediaId }, 'Media removed from vector index');
    } catch (error) {
      logger.error({ err: error, mediaId }, 'Failed to remove media from index');
      throw error;
    }
  }

  /**
   * Get vector index statistics
   */
  async getIndexStats(): Promise<{
    totalVectors: number;
    dimensions: number;
    indexType: string;
  }> {
    try {
      return await this.vectorClient.getCollectionStats(this.mediaCollection);
    } catch (error) {
      logger.error({ err: error }, 'Failed to get index stats');
      throw error;
    }
  }

  // Private helper methods

  private combineResults(
    keywordResults: Array<MediaItem & { relevanceScore: number }>,
    semanticResults: Array<MediaItem & { relevanceScore: number }>,
    hybridWeight: number,
    limit: number
  ): MediaItem[] {
    const itemMap = new Map<string, MediaItem & { combinedScore: number }>();

    // Add keyword results
    keywordResults.forEach(item => {
      itemMap.set(item.id, {
        ...item,
        combinedScore: item.relevanceScore * (1 - hybridWeight),
      });
    });

    // Add/merge semantic results
    semanticResults.forEach(item => {
      const existing = itemMap.get(item.id);

      if (existing) {
        existing.combinedScore += item.relevanceScore * hybridWeight;
      } else {
        itemMap.set(item.id, {
          ...item,
          combinedScore: item.relevanceScore * hybridWeight,
        });
      }
    });

    // Sort by combined score and return top results
    return Array.from(itemMap.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, limit)
      .map(({ combinedScore, relevanceScore, ...item }) => item);
  }

  private tokenizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2);
  }

  private calculateKeywordRelevance(media: MediaItem, queryTerms: string[]): number {
    let score = 0;

    const searchableText = [
      media.title,
      media.description,
      ...(media.genres || []),
      media.director || '',
    ]
      .join(' ')
      .toLowerCase();

    queryTerms.forEach(term => {
      if (searchableText.includes(term)) {
        // Title matches are weighted higher
        if (media.title.toLowerCase().includes(term)) {
          score += 2;
        } else {
          score += 1;
        }
      }
    });

    // Normalize score
    return Math.min(score / (queryTerms.length * 2), 1.0);
  }

  private calculateAverageRelevance(
    items: Array<MediaItem & { relevanceScore?: number }>
  ): number {
    if (items.length === 0) return 0;

    const sum = items.reduce((acc, item) => acc + (item.relevanceScore || 0), 0);
    return sum / items.length;
  }

  private buildMetadataFilter(filters?: SearchFilters): Record<string, any> | undefined {
    if (!filters) return undefined;

    const metadataFilter: Record<string, any> = {};

    if (filters.type && filters.type.length > 0) {
      metadataFilter.type = filters.type;
    }

    if (filters.genres && filters.genres.length > 0) {
      metadataFilter.genres = filters.genres;
    }

    return Object.keys(metadataFilter).length > 0 ? metadataFilter : undefined;
  }

  private applyFilters(
    items: MediaItem[],
    filters?: SearchFilters
  ): MediaItem[] {
    if (!filters) return items;

    return items.filter(item => {
      // Type filter
      if (filters.type && filters.type.length > 0 && !filters.type.includes(item.type)) {
        return false;
      }

      // Genre filter
      if (filters.genres && filters.genres.length > 0) {
        const hasMatchingGenre = filters.genres.some(genre => item.genres?.includes(genre));
        if (!hasMatchingGenre) return false;
      }

      // Rating filter
      if (filters.minRating && item.rating < filters.minRating) {
        return false;
      }

      // Release year filter
      if (filters.releaseYearMin || filters.releaseYearMax) {
        const year = new Date(item.releaseDate).getFullYear();

        if (filters.releaseYearMin && year < filters.releaseYearMin) {
          return false;
        }

        if (filters.releaseYearMax && year > filters.releaseYearMax) {
          return false;
        }
      }

      return true;
    });
  }

  private async getUserWatchHistory(userId: string): Promise<string[]> {
    try {
      // This would fetch from user model
      return [];
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get watch history');
      return [];
    }
  }

  /**
   * Disconnect from vector database
   */
  async disconnect(): Promise<void> {
    await this.vectorClient.disconnect();
    logger.info('Vector search service disconnected');
  }
}

export default new VectorSearchService();
export type { VectorSearchOptions, VectorSearchResult, SimilarContentOptions };
