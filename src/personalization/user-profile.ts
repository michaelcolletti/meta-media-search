/**
 * User Profile Management
 * Handles user profile operations and preference management
 */

import userModel from '../backend/models/user.model.js';
import personalizationEngine from './engine.js';
import logger from '../backend/utils/logger.js';
import cacheService from '../backend/services/cache.service.js';
import { UserPreferences } from '@types/index.js';
import type {
  UserInteraction,
  PersonalizationProfile,
} from './engine.js';

interface ProfileAnalytics {
  totalInteractions: number;
  topGenres: Array<{ genre: string; weight: number }>;
  topPlatforms: Array<{ platform: string; weight: number }>;
  contentTypeDistribution: Record<string, number>;
  averageRating: number;
  lastActivityDate: Date;
  profileCompleteness: number;
}

interface PreferenceUpdate {
  genres?: string[];
  platforms?: string[];
  contentTypes?: string[];
  minRating?: number;
  excludeMature?: boolean;
}

interface InteractionStats {
  likes: number;
  watches: number;
  views: number;
  searches: number;
  skips: number;
  dislikes: number;
}

/**
 * User profile management service
 */
class UserProfileService {
  /**
   * Get complete user profile with analytics
   */
  async getUserProfile(userId: string): Promise<{
    preferences: UserPreferences;
    personalization: PersonalizationProfile | null;
    analytics: ProfileAnalytics;
  }> {
    try {
      // Check cache
      const cacheKey = cacheService.generateKey('complete_profile', userId);
      const cached = await cacheService.get<any>(cacheKey);

      if (cached) {
        logger.debug({ userId, cached: true }, 'Profile cache hit');
        return cached;
      }

      // Get user preferences from database
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get personalization profile
      const personalization = await personalizationEngine.getUserProfile(userId);

      // Calculate analytics
      const analytics = await this.calculateProfileAnalytics(userId, personalization);

      const profile = {
        preferences: user.preferences,
        personalization,
        analytics,
      };

      // Cache profile
      await cacheService.set(cacheKey, profile, 1800); // 30 minutes

      logger.info({ userId }, 'User profile retrieved');

      return profile;
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get user profile');
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, updates: PreferenceUpdate): Promise<UserPreferences> {
    try {
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Merge updates with existing preferences
      const updatedPreferences: UserPreferences = {
        ...user.preferences,
        ...updates,
      };

      // Update in database
      await userModel.updatePreferences(userId, updatedPreferences);

      // Invalidate caches
      await this.invalidateProfileCache(userId);

      logger.info({ userId, updates }, 'User preferences updated');

      return updatedPreferences;
    } catch (error) {
      logger.error({ err: error, userId, updates }, 'Failed to update preferences');
      throw error;
    }
  }

  /**
   * Track user interaction
   */
  async trackInteraction(
    userId: string,
    interaction: Omit<UserInteraction, 'userId' | 'timestamp'>
  ): Promise<void> {
    try {
      // Get media details (would normally query from database)
      const media = await this.getMediaDetails(interaction.mediaId);

      if (!media) {
        logger.warn({ userId, mediaId: interaction.mediaId }, 'Media not found for interaction');
        return;
      }

      // Create full interaction object
      const fullInteraction: UserInteraction = {
        userId,
        ...interaction,
        timestamp: new Date(),
      };

      // Update watch history or favorites if applicable
      if (interaction.type === 'watch') {
        await userModel.addToWatchHistory(userId, interaction.mediaId);
      } else if (interaction.type === 'like') {
        await userModel.addToFavorites(userId, interaction.mediaId);
      }

      // Learn from interaction
      await personalizationEngine.learnFromInteraction(fullInteraction, media);

      logger.debug({ userId, interaction: fullInteraction.type, mediaId: interaction.mediaId }, 'Interaction tracked');
    } catch (error) {
      logger.error({ err: error, userId, interaction }, 'Failed to track interaction');
      throw error;
    }
  }

  /**
   * Get interaction statistics for user
   */
  async getInteractionStats(userId: string): Promise<InteractionStats> {
    try {
      const cacheKey = cacheService.generateKey('interaction_stats', userId);
      const cached = await cacheService.get<InteractionStats>(cacheKey);

      if (cached) {
        return cached;
      }

      // This would normally query from interaction collection
      // For now, return placeholder data
      const stats: InteractionStats = {
        likes: 0,
        watches: 0,
        views: 0,
        searches: 0,
        skips: 0,
        dislikes: 0,
      };

      // Cache stats
      await cacheService.set(cacheKey, stats, 3600); // 1 hour

      return stats;
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get interaction stats');
      throw error;
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData(userId: string): Promise<{
    profile: any;
    interactions: any[];
    preferences: UserPreferences;
  }> {
    try {
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const personalization = await personalizationEngine.getUserProfile(userId);
      const analytics = await this.calculateProfileAnalytics(userId, personalization);

      const exportData = {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          analytics,
        },
        interactions: [], // Would fetch from interaction collection
        preferences: user.preferences,
      };

      logger.info({ userId }, 'User data exported');

      return exportData;
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to export user data');
      throw error;
    }
  }

  /**
   * Delete user profile and data (GDPR compliance)
   */
  async deleteUserProfile(userId: string): Promise<void> {
    try {
      // Delete from database
      await userModel.delete(userId);

      // Delete personalization data (would delete from vector DB)
      // await personalizationEngine.deleteUserProfile(userId);

      // Clear all caches
      await this.invalidateProfileCache(userId);

      logger.info({ userId }, 'User profile deleted');
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to delete user profile');
      throw error;
    }
  }

  /**
   * Get profile completeness score
   */
  async getProfileCompleteness(userId: string): Promise<{
    score: number;
    suggestions: string[];
  }> {
    try {
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const suggestions: string[] = [];
      let score = 0;

      // Check preferences
      if (user.preferences.genres && user.preferences.genres.length > 0) {
        score += 25;
      } else {
        suggestions.push('Add your favorite genres');
      }

      if (user.preferences.platforms && user.preferences.platforms.length > 0) {
        score += 25;
      } else {
        suggestions.push('Select your streaming platforms');
      }

      if (user.preferences.contentTypes && user.preferences.contentTypes.length > 0) {
        score += 20;
      } else {
        suggestions.push('Choose your content preferences');
      }

      // Check interaction history
      const personalization = await personalizationEngine.getUserProfile(userId);
      if (personalization && personalization.interactionCount > 5) {
        score += 30;
      } else {
        suggestions.push('Interact with more content to improve recommendations');
      }

      return { score, suggestions };
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get profile completeness');
      throw error;
    }
  }

  /**
   * Get similar users (for collaborative filtering)
   */
  async getSimilarUsers(userId: string, limit: number = 10): Promise<string[]> {
    try {
      const profile = await personalizationEngine.getUserProfile(userId);

      if (!profile) {
        return [];
      }

      // Would use vector similarity search to find similar users
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get similar users');
      throw error;
    }
  }

  // Private helper methods

  private async calculateProfileAnalytics(
    userId: string,
    personalization: PersonalizationProfile | null
  ): Promise<ProfileAnalytics> {
    const analytics: ProfileAnalytics = {
      totalInteractions: personalization?.interactionCount || 0,
      topGenres: [],
      topPlatforms: [],
      contentTypeDistribution: {},
      averageRating: personalization?.ratingThreshold || 7.0,
      lastActivityDate: personalization?.lastUpdated || new Date(),
      profileCompleteness: 0,
    };

    if (personalization) {
      // Top genres
      analytics.topGenres = Array.from(personalization.genreWeights.entries())
        .map(([genre, weight]) => ({ genre, weight }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5);

      // Top platforms
      analytics.topPlatforms = Array.from(personalization.platformPreferences.entries())
        .map(([platform, weight]) => ({ platform, weight }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5);

      // Content type distribution
      const totalWeight = Array.from(personalization.contentTypeWeights.values()).reduce(
        (sum, w) => sum + w,
        0
      );

      for (const [type, weight] of personalization.contentTypeWeights.entries()) {
        analytics.contentTypeDistribution[type] = totalWeight > 0 ? weight / totalWeight : 0;
      }
    }

    // Calculate profile completeness
    const { score } = await this.getProfileCompleteness(userId);
    analytics.profileCompleteness = score;

    return analytics;
  }

  private async getMediaDetails(mediaId: string): Promise<any> {
    try {
      // This would normally query from media model
      // For now, return null (would be implemented based on actual media model)
      return null;
    } catch (error) {
      logger.error({ err: error, mediaId }, 'Failed to get media details');
      return null;
    }
  }

  private async invalidateProfileCache(userId: string): Promise<void> {
    const cacheKeys = [
      cacheService.generateKey('complete_profile', userId),
      cacheService.generateKey('user_profile', userId),
      cacheService.generateKey('interaction_stats', userId),
      cacheService.generateKey('recommendations', userId),
      cacheService.generateKey('discover', userId),
    ];

    await Promise.all(cacheKeys.map(key => cacheService.delete(key)));
  }
}

export default new UserProfileService();
export type { ProfileAnalytics, PreferenceUpdate, InteractionStats };
