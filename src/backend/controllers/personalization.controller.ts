/**
 * Personalization Controller
 * Handles personalization-related business logic
 */

import personalizationEngine from '../../personalization/engine.js';
import userProfileService from '../../personalization/user-profile.js';
import vectorSearchService from '../services/vector-search.service.js';
import mediaModel from '../models/media.model.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import type {
  PersonalizedRecommendation,
  UserInteraction,
} from '../../personalization/engine.js';
import type { MediaItem } from '@types/index.js';

/**
 * Personalization controller class
 */
class PersonalizationController {
  /**
   * Get personalized feed for user
   */
  async getPersonalizedFeed(
    userId: string,
    options: {
      limit?: number;
      includeRecommendations?: boolean;
      includeTrending?: boolean;
    } = {}
  ): Promise<{
    recommendations: PersonalizedRecommendation[];
    trending: MediaItem[];
    newReleases: MediaItem[];
  }> {
    try {
      const limit = options.limit || 20;

      // Get user profile to check personalization readiness
      const profile = await personalizationEngine.getUserProfile(userId);

      let recommendations: PersonalizedRecommendation[] = [];
      const trending: MediaItem[] = [];
      const newReleases: MediaItem[] = [];

      // Get personalized recommendations if user has enough interaction history
      if (profile && profile.interactionCount >= 3 && options.includeRecommendations !== false) {
        // Fetch candidate media items
        const candidates = await this.getCandidateMedia(limit * 3);

        recommendations = await personalizationEngine.getPersonalizedRecommendations(
          userId,
          candidates,
          {
            diversityWeight: 0.3,
            recencyWeight: 0.2,
            popularityWeight: 0.1,
            personalWeight: 0.4,
          }
        );
      }

      // Get trending content
      if (options.includeTrending !== false) {
        const trendingItems = await mediaModel.getTrending(10);
        trending.push(...trendingItems);
      }

      // Get new releases
      const recentItems = await mediaModel.search(
        {},
        {
          page: 1,
          limit: 10,
          sortBy: 'created_at',
          sortOrder: 'desc',
        }
      );
      newReleases.push(...recentItems.items);

      logger.info(
        {
          userId,
          recommendationCount: recommendations.length,
          trendingCount: trending.length,
          newReleasesCount: newReleases.length,
        },
        'Personalized feed generated'
      );

      return {
        recommendations,
        trending,
        newReleases,
      };
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get personalized feed');
      throw error;
    }
  }

  /**
   * Process bulk interactions
   */
  async processBulkInteractions(
    userId: string,
    interactions: Omit<UserInteraction, 'userId' | 'timestamp'>[]
  ): Promise<{ processed: number; failed: number }> {
    try {
      let processed = 0;
      let failed = 0;

      for (const interaction of interactions) {
        try {
          await userProfileService.trackInteraction(userId, interaction);
          processed++;
        } catch (error) {
          logger.error({ err: error, userId, interaction }, 'Failed to process interaction');
          failed++;
        }
      }

      logger.info(
        { userId, processed, failed, total: interactions.length },
        'Bulk interactions processed'
      );

      return { processed, failed };
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to process bulk interactions');
      throw error;
    }
  }

  /**
   * Get personalized search results
   */
  async personalizedSearch(
    query: string,
    userId?: string,
    options: {
      limit?: number;
      filters?: any;
      usePersonalization?: boolean;
    } = {}
  ): Promise<{
    items: MediaItem[];
    personalized: boolean;
    confidence?: number;
  }> {
    try {
      const limit = options.limit || 20;

      // Perform hybrid search
      const searchResult = await vectorSearchService.hybridSearch(query, {
        limit: limit * 2,
        filters: options.filters,
        hybridWeight: 0.6, // Favor semantic search
      });

      let items = searchResult.items;
      let personalized = false;
      let confidence: number | undefined;

      // Apply personalization if user is authenticated and has profile
      if (userId && options.usePersonalization !== false) {
        const profile = await personalizationEngine.getUserProfile(userId);

        if (profile && profile.interactionCount >= 5) {
          // Rerank results based on user preferences
          const personalizedResults = await personalizationEngine.getPersonalizedRecommendations(
            userId,
            items,
            {
              diversityWeight: 0.2,
              personalWeight: 0.8,
            }
          );

          items = personalizedResults.map(r => r.item);
          personalized = true;
          confidence = personalizedResults[0]?.confidence;
        }
      }

      return {
        items: items.slice(0, limit),
        personalized,
        confidence,
      };
    } catch (error) {
      logger.error({ err: error, query, userId }, 'Failed to perform personalized search');
      throw error;
    }
  }

  /**
   * Get content discovery suggestions
   */
  async getDiscoverySuggestions(
    userId: string,
    options: {
      exploreNew?: boolean;
      limit?: number;
    } = {}
  ): Promise<{
    forYou: MediaItem[];
    explore: MediaItem[];
    becauseYouWatched: Array<{
      sourceMedia: MediaItem;
      recommendations: MediaItem[];
    }>;
  }> {
    try {
      const limit = options.limit || 10;

      const profile = await personalizationEngine.getUserProfile(userId);

      const forYou: MediaItem[] = [];
      const explore: MediaItem[] = [];
      const becauseYouWatched: Array<{
        sourceMedia: MediaItem;
        recommendations: MediaItem[];
      }> = [];

      // Get "For You" recommendations
      if (profile && profile.interactionCount >= 3) {
        const candidates = await this.getCandidateMedia(limit * 2);
        const recommendations = await personalizationEngine.getPersonalizedRecommendations(
          userId,
          candidates,
          { personalWeight: 0.7 }
        );

        forYou.push(...recommendations.slice(0, limit).map(r => r.item));
      }

      // Get "Explore" content (diverse from user's usual preferences)
      if (options.exploreNew !== false) {
        const exploreContent = await this.getExploreContent(userId, limit);
        explore.push(...exploreContent);
      }

      // Get "Because You Watched" recommendations
      const watchHistory = await this.getRecentWatchHistory(userId, 3);

      for (const mediaId of watchHistory) {
        const sourceMedia = await mediaModel.findById(mediaId);

        if (sourceMedia) {
          const similar = await vectorSearchService.findSimilarContent({
            mediaId,
            limit: 5,
            excludeWatched: true,
            userId,
          });

          if (similar.length > 0) {
            becauseYouWatched.push({
              sourceMedia,
              recommendations: similar,
            });
          }
        }
      }

      logger.info(
        {
          userId,
          forYouCount: forYou.length,
          exploreCount: explore.length,
          becauseYouWatchedCount: becauseYouWatched.length,
        },
        'Discovery suggestions generated'
      );

      return {
        forYou,
        explore,
        becauseYouWatched,
      };
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get discovery suggestions');
      throw error;
    }
  }

  // Private helper methods

  private async getCandidateMedia(limit: number): Promise<MediaItem[]> {
    try {
      const result = await mediaModel.search(
        {},
        {
          page: 1,
          limit,
          sortBy: 'rating',
          sortOrder: 'desc',
        }
      );

      return result.items;
    } catch (error) {
      logger.error({ err: error, limit }, 'Failed to get candidate media');
      return [];
    }
  }

  private async getExploreContent(userId: string, limit: number): Promise<MediaItem[]> {
    try {
      const profile = await personalizationEngine.getUserProfile(userId);

      if (!profile) {
        // Return popular content for new users
        return await mediaModel.getTrending(limit);
      }

      // Get genres user hasn't explored much
      const allGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Documentary'];
      const userGenres = Array.from(profile.genreWeights.keys());
      const unexploredGenres = allGenres.filter(g => !userGenres.includes(g));

      if (unexploredGenres.length === 0) {
        return await mediaModel.getTrending(limit);
      }

      // Get content from unexplored genres
      const result = await mediaModel.search(
        {
          genres: unexploredGenres.slice(0, 3),
          minRating: 7.0,
        },
        {
          page: 1,
          limit,
          sortBy: 'rating',
          sortOrder: 'desc',
        }
      );

      return result.items;
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get explore content');
      return [];
    }
  }

  private async getRecentWatchHistory(userId: string, limit: number): Promise<string[]> {
    try {
      // This would fetch from user model
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get watch history');
      return [];
    }
  }
}

export default new PersonalizationController();
