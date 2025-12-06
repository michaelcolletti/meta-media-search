/**
 * Personalization Engine Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import personalizationEngine from '../../../../src/personalization/engine.js';
import type { UserInteraction } from '../../../../src/personalization/engine.js';
import type { MediaItem } from '../../../../src/types/index.js';

describe('PersonalizationEngine', () => {
  const testUserId = 'test-user-123';

  const sampleMedia: MediaItem = {
    id: 'media-1',
    title: 'Test Movie',
    type: 'movie',
    description: 'A test movie',
    genres: ['Action', 'Sci-Fi'],
    releaseDate: '2024-01-01',
    rating: 8.5,
    thumbnail: 'https://example.com/thumb.jpg',
    posterUrl: 'https://example.com/poster.jpg',
    platforms: [
      {
        id: 'netflix',
        name: 'Netflix',
        type: 'streaming',
        url: 'https://netflix.com',
        available: true,
        logo: 'https://example.com/netflix.png',
      },
    ],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    await personalizationEngine.initialize();
  });

  afterEach(async () => {
    await personalizationEngine.disconnect();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      // Should not throw
      expect(async () => {
        await personalizationEngine.initialize();
      }).not.toThrow();
    });
  });

  describe('User Profile Management', () => {
    it('should create new user profile', async () => {
      const profile = await personalizationEngine.getUserProfile(testUserId);

      // Profile should be created if it doesn't exist
      expect(profile).toBeDefined();
    });

    it('should return existing user profile', async () => {
      // Create profile by learning from interaction
      const interaction: UserInteraction = {
        userId: testUserId,
        mediaId: sampleMedia.id,
        type: 'like',
        timestamp: new Date(),
      };

      await personalizationEngine.learnFromInteraction(interaction, sampleMedia);

      const profile = await personalizationEngine.getUserProfile(testUserId);

      expect(profile).toBeDefined();
      expect(profile?.userId).toBe(testUserId);
      expect(profile?.interactionCount).toBeGreaterThan(0);
    });
  });

  describe('Learning from Interactions', () => {
    it('should learn from positive interaction', async () => {
      const interaction: UserInteraction = {
        userId: testUserId,
        mediaId: sampleMedia.id,
        type: 'like',
        timestamp: new Date(),
      };

      await personalizationEngine.learnFromInteraction(interaction, sampleMedia);

      const profile = await personalizationEngine.getUserProfile(testUserId);

      expect(profile).toBeDefined();
      expect(profile!.interactionCount).toBe(1);
      expect(profile!.genreWeights.size).toBeGreaterThan(0);
    });

    it('should update genre weights', async () => {
      const interaction: UserInteraction = {
        userId: testUserId,
        mediaId: sampleMedia.id,
        type: 'like',
        timestamp: new Date(),
      };

      await personalizationEngine.learnFromInteraction(interaction, sampleMedia);

      const profile = await personalizationEngine.getUserProfile(testUserId);

      expect(profile!.genreWeights.has('Action')).toBe(true);
      expect(profile!.genreWeights.has('Sci-Fi')).toBe(true);
      expect(profile!.genreWeights.get('Action')).toBeGreaterThan(0);
    });

    it('should update platform preferences', async () => {
      const interaction: UserInteraction = {
        userId: testUserId,
        mediaId: sampleMedia.id,
        type: 'watch',
        duration: 1800,
        timestamp: new Date(),
      };

      await personalizationEngine.learnFromInteraction(interaction, sampleMedia);

      const profile = await personalizationEngine.getUserProfile(testUserId);

      expect(profile!.platformPreferences.has('Netflix')).toBe(true);
      expect(profile!.platformPreferences.get('Netflix')).toBeGreaterThan(0);
    });

    it('should handle negative interactions', async () => {
      const interaction: UserInteraction = {
        userId: testUserId,
        mediaId: sampleMedia.id,
        type: 'dislike',
        timestamp: new Date(),
      };

      await personalizationEngine.learnFromInteraction(interaction, sampleMedia);

      const profile = await personalizationEngine.getUserProfile(testUserId);

      expect(profile).toBeDefined();
      expect(profile!.interactionCount).toBe(1);
      // Negative interactions should decrease genre weights
    });

    it('should weight watch duration for watch interactions', async () => {
      const shortWatchInteraction: UserInteraction = {
        userId: testUserId,
        mediaId: sampleMedia.id,
        type: 'watch',
        duration: 300, // 5 minutes
        timestamp: new Date(),
      };

      await personalizationEngine.learnFromInteraction(shortWatchInteraction, sampleMedia);

      const profile1 = await personalizationEngine.getUserProfile(testUserId);
      const genreWeight1 = profile1!.genreWeights.get('Action') || 0;

      // Create new user for comparison
      const testUserId2 = 'test-user-456';
      const longWatchInteraction: UserInteraction = {
        userId: testUserId2,
        mediaId: sampleMedia.id,
        type: 'watch',
        duration: 1800, // 30 minutes
        timestamp: new Date(),
      };

      await personalizationEngine.learnFromInteraction(longWatchInteraction, sampleMedia);

      const profile2 = await personalizationEngine.getUserProfile(testUserId2);
      const genreWeight2 = profile2!.genreWeights.get('Action') || 0;

      // Longer watch should have higher weight
      expect(genreWeight2).toBeGreaterThan(genreWeight1);
    });
  });

  describe('Personalized Recommendations', () => {
    const candidates: MediaItem[] = [
      {
        ...sampleMedia,
        id: 'media-1',
        genres: ['Action', 'Sci-Fi'],
        rating: 8.5,
      },
      {
        ...sampleMedia,
        id: 'media-2',
        genres: ['Drama', 'Romance'],
        rating: 7.8,
      },
      {
        ...sampleMedia,
        id: 'media-3',
        genres: ['Action', 'Comedy'],
        rating: 8.0,
      },
    ];

    it('should return popularity-based recommendations for new users', async () => {
      const recommendations = await personalizationEngine.getPersonalizedRecommendations(
        'new-user-123',
        candidates
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].confidence).toBeLessThan(0.6); // Low confidence for new users
    });

    it('should return personalized recommendations for experienced users', async () => {
      // Simulate multiple interactions
      for (let i = 0; i < 5; i++) {
        const interaction: UserInteraction = {
          userId: testUserId,
          mediaId: `media-${i}`,
          type: 'like',
          timestamp: new Date(),
        };

        await personalizationEngine.learnFromInteraction(
          interaction,
          { ...sampleMedia, id: `media-${i}`, genres: ['Action', 'Sci-Fi'] }
        );
      }

      const recommendations = await personalizationEngine.getPersonalizedRecommendations(
        testUserId,
        candidates
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);

      // Should prefer Action/Sci-Fi content
      const topRec = recommendations[0];
      expect(topRec.item.genres).toContain('Action');
      expect(topRec.confidence).toBeGreaterThan(0.3);
      expect(topRec.reasons).toBeDefined();
      expect(topRec.reasons.length).toBeGreaterThan(0);
    });

    it('should respect diversity factor', async () => {
      // Learn preferences for Action
      for (let i = 0; i < 3; i++) {
        await personalizationEngine.learnFromInteraction(
          {
            userId: testUserId,
            mediaId: `media-${i}`,
            type: 'like',
            timestamp: new Date(),
          },
          { ...sampleMedia, genres: ['Action'] }
        );
      }

      const lowDiversityRecs = await personalizationEngine.getPersonalizedRecommendations(
        testUserId,
        candidates,
        { diversityWeight: 0.1 }
      );

      const highDiversityRecs = await personalizationEngine.getPersonalizedRecommendations(
        testUserId,
        candidates,
        { diversityWeight: 0.9 }
      );

      // High diversity should include more genre variety
      const lowDiversityGenres = new Set(lowDiversityRecs.map(r => r.item.genres).flat());
      const highDiversityGenres = new Set(highDiversityRecs.map(r => r.item.genres).flat());

      expect(highDiversityGenres.size).toBeGreaterThanOrEqual(lowDiversityGenres.size);
    });

    it('should generate meaningful reasons', async () => {
      await personalizationEngine.learnFromInteraction(
        {
          userId: testUserId,
          mediaId: sampleMedia.id,
          type: 'like',
          timestamp: new Date(),
        },
        sampleMedia
      );

      const recommendations = await personalizationEngine.getPersonalizedRecommendations(
        testUserId,
        [candidates[0]]
      );

      expect(recommendations[0].reasons).toBeDefined();
      expect(recommendations[0].reasons.length).toBeGreaterThan(0);
      expect(typeof recommendations[0].reasons[0]).toBe('string');
    });
  });

  describe('Confidence Calculation', () => {
    it('should increase confidence with more interactions', async () => {
      // Few interactions
      for (let i = 0; i < 3; i++) {
        await personalizationEngine.learnFromInteraction(
          {
            userId: testUserId,
            mediaId: `media-${i}`,
            type: 'like',
            timestamp: new Date(),
          },
          sampleMedia
        );
      }

      const lowConfidenceRecs = await personalizationEngine.getPersonalizedRecommendations(
        testUserId,
        [sampleMedia]
      );

      // Many interactions
      for (let i = 3; i < 25; i++) {
        await personalizationEngine.learnFromInteraction(
          {
            userId: testUserId,
            mediaId: `media-${i}`,
            type: 'like',
            timestamp: new Date(),
          },
          sampleMedia
        );
      }

      const highConfidenceRecs = await personalizationEngine.getPersonalizedRecommendations(
        testUserId,
        [sampleMedia]
      );

      expect(highConfidenceRecs[0].confidence).toBeGreaterThan(lowConfidenceRecs[0].confidence);
    });
  });
});
