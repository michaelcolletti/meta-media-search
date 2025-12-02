import mediaModel from '../models/media.model.js';
import userModel from '../models/user.model.js';
import aiService from './ai.service.js';
import cacheService from './cache.service.js';
import { RecommendationRequest, RecommendationResult, MediaItem } from '@types/index.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

class RecommendationService {
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    try {
      const cacheKey = cacheService.generateKey(
        'recommendations',
        request.userId,
        JSON.stringify(request.basedOn || []),
        request.limit || 10
      );

      const cached = await cacheService.get<RecommendationResult>(cacheKey);
      if (cached) {
        logger.info({ userId: request.userId, cached: true }, 'Recommendations cache hit');
        return cached;
      }

      // Get user data
      const user = await userModel.findById(request.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user's watch history and favorites
      const watchHistory = await userModel.getWatchHistory(request.userId);
      const favorites = await userModel.getFavorites(request.userId);

      // Combine watch history and favorites, prioritizing favorites
      const seedItems = [...new Set([...favorites, ...watchHistory])];

      if (seedItems.length === 0) {
        // No history, return trending content
        const trending = await mediaModel.getTrending(request.limit || 10);

        return {
          items: trending,
          reasoning: 'These are currently trending titles that match popular preferences.',
          confidence: 0.5,
          factors: {
            genreMatch: 0,
            platformAvailability: 0,
            ratingAlignment: 0,
            contentSimilarity: 0,
          },
        };
      }

      // Get embeddings for user's watched content
      const seedEmbeddings: number[] = [];
      for (const itemId of seedItems.slice(0, 20)) {
        const item = await mediaModel.findById(itemId);
        if (item?.embedding) {
          seedEmbeddings.push(...item.embedding);
        }
      }

      // Calculate average embedding vector
      const avgEmbedding = this.calculateAverageEmbedding(seedEmbeddings);

      // Find similar content using vector similarity
      const similarItems = await mediaModel.searchBySimilarity(
        avgEmbedding,
        (request.limit || 10) * 3
      );

      // Filter out already watched content
      const watchedSet = new Set(seedItems);
      const candidates = similarItems.filter(item => !watchedSet.has(item.id));

      // Score and rank candidates
      const scoredItems = await this.scoreRecommendations(
        candidates,
        user.preferences,
        avgEmbedding,
        request.diversityFactor || 0.3
      );

      // Apply diversity factor
      const finalItems = this.diversifyRecommendations(
        scoredItems,
        request.limit || 10,
        request.diversityFactor || 0.3
      );

      // Calculate overall factors
      const factors = this.calculateFactors(finalItems, user.preferences);

      // Generate explanation
      const reasoning = await aiService.generateRecommendationExplanation(
        finalItems.slice(0, 3).map(item => ({
          title: item.title,
          type: item.type,
          genres: item.genres || [],
        })),
        factors
      );

      const result: RecommendationResult = {
        items: finalItems.slice(0, request.limit || 10),
        reasoning,
        confidence: this.calculateConfidence(seedItems.length, factors),
        factors,
      };

      // Cache recommendations
      await cacheService.set(cacheKey, result, 3600); // 1 hour

      logger.info(
        {
          userId: request.userId,
          recommendationsCount: result.items.length,
          confidence: result.confidence,
        },
        'Recommendations generated'
      );

      return result;
    } catch (error) {
      logger.error({ err: error, request }, 'Recommendation error');
      throw error;
    }
  }

  private calculateAverageEmbedding(embeddings: number[]): number[] {
    if (embeddings.length === 0) {
      return new Array(config.EMBEDDING_DIMENSIONS).fill(0);
    }

    const dimensions = config.EMBEDDING_DIMENSIONS;
    const numVectors = embeddings.length / dimensions;
    const avgEmbedding = new Array(dimensions).fill(0);

    for (let i = 0; i < embeddings.length; i++) {
      avgEmbedding[i % dimensions] += embeddings[i];
    }

    return avgEmbedding.map(sum => sum / numVectors);
  }

  private async scoreRecommendations(
    items: MediaItem[],
    preferences: any,
    userEmbedding: number[],
    diversityFactor: number
  ): Promise<Array<MediaItem & { score: number }>> {
    return items
      .map(item => {
        let score = 0;

        // Genre match (30% weight)
        if (preferences.genres && preferences.genres.length > 0) {
          const genreMatches = item.genres?.filter(g => preferences.genres.includes(g)).length || 0;
          score += (genreMatches / Math.max(preferences.genres.length, 1)) * 0.3;
        }

        // Rating alignment (25% weight)
        const minRating = preferences.minRating || 7.0;
        if (item.rating >= minRating) {
          score += 0.25;
        }

        // Platform availability (15% weight)
        if (preferences.platforms && preferences.platforms.length > 0) {
          const platformMatches =
            item.platforms?.filter(p => preferences.platforms.includes(p.name)).length || 0;
          if (platformMatches > 0) {
            score += 0.15;
          }
        }

        // Semantic similarity (30% weight)
        if (item.embedding) {
          const similarity = aiService.calculateCosineSimilarity(userEmbedding, item.embedding);
          score += similarity * 0.3;
        }

        return { ...item, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  private diversifyRecommendations(
    items: Array<MediaItem & { score: number }>,
    limit: number,
    diversityFactor: number
  ): MediaItem[] {
    const selected: MediaItem[] = [];
    const selectedGenres = new Set<string>();

    for (const item of items) {
      if (selected.length >= limit) break;

      // Check genre diversity
      const newGenres = item.genres?.filter(g => !selectedGenres.has(g)) || [];
      const diversityBonus = newGenres.length * diversityFactor;

      // If high diversity or high score, include it
      if (diversityBonus > 0.2 || item.score > 0.7 || selected.length < limit / 2) {
        selected.push(item);
        item.genres?.forEach(g => selectedGenres.add(g));
      }
    }

    // Fill remaining slots with top scores if needed
    if (selected.length < limit) {
      for (const item of items) {
        if (selected.length >= limit) break;
        if (!selected.find(s => s.id === item.id)) {
          selected.push(item);
        }
      }
    }

    return selected;
  }

  private calculateFactors(
    items: MediaItem[],
    preferences: any
  ): {
    genreMatch: number;
    platformAvailability: number;
    ratingAlignment: number;
    contentSimilarity: number;
  } {
    if (items.length === 0) {
      return {
        genreMatch: 0,
        platformAvailability: 0,
        ratingAlignment: 0,
        contentSimilarity: 0,
      };
    }

    let genreMatch = 0;
    let platformAvailability = 0;
    let ratingAlignment = 0;

    items.forEach(item => {
      if (preferences.genres) {
        const matches = item.genres?.filter(g => preferences.genres.includes(g)).length || 0;
        genreMatch += matches / Math.max(preferences.genres.length, 1);
      }

      if (preferences.platforms) {
        const matches =
          item.platforms?.filter(p => preferences.platforms.includes(p.name)).length || 0;
        platformAvailability += matches > 0 ? 1 : 0;
      }

      const minRating = preferences.minRating || 7.0;
      ratingAlignment += item.rating >= minRating ? 1 : 0;
    });

    return {
      genreMatch: genreMatch / items.length,
      platformAvailability: platformAvailability / items.length,
      ratingAlignment: ratingAlignment / items.length,
      contentSimilarity: 0.75, // Placeholder - would calculate from embeddings
    };
  }

  private calculateConfidence(historySize: number, factors: any): number {
    // Base confidence on amount of history
    let confidence = Math.min(historySize / 20, 0.5);

    // Boost with factor scores
    confidence +=
      factors.genreMatch * 0.2 +
      factors.platformAvailability * 0.1 +
      factors.ratingAlignment * 0.1 +
      factors.contentSimilarity * 0.1;

    return Math.min(confidence, 1.0);
  }
}

export default new RecommendationService();
