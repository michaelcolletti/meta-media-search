/**
 * Personalization Engine
 * Real-time user preference learning and personalized content delivery
 */

import RuVectorClient from '../vector-db/ruvector-client.js';
import embeddingService from '../vector-db/embedding-service.js';
import logger from '../backend/utils/logger.js';
import cacheService from '../backend/services/cache.service.js';
import { MediaItem, UserPreferences } from '@types/index.js';

interface UserInteraction {
  userId: string;
  mediaId: string;
  type: 'view' | 'like' | 'dislike' | 'watch' | 'skip' | 'search';
  duration?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface PersonalizationProfile {
  userId: string;
  preferenceVector: number[];
  genreWeights: Map<string, number>;
  platformPreferences: Map<string, number>;
  contentTypeWeights: Map<string, number>;
  ratingThreshold: number;
  interactionCount: number;
  lastUpdated: Date;
}

interface PersonalizedRecommendation {
  item: MediaItem;
  score: number;
  reasons: string[];
  confidence: number;
}

interface PersonalizationOptions {
  diversityWeight?: number;
  recencyWeight?: number;
  popularityWeight?: number;
  personalWeight?: number;
}

/**
 * Advanced personalization engine with real-time learning
 */
class PersonalizationEngine {
  private vectorClient: RuVectorClient;
  private profileCollection = 'user_profiles';
  private interactionCollection = 'user_interactions';
  private learningRate = 0.1;
  private decayFactor = 0.95;

  constructor() {
    this.vectorClient = new RuVectorClient({
      defaultCollection: this.profileCollection,
      dimensions: 1536,
    });
  }

  /**
   * Initialize personalization engine
   */
  async initialize(): Promise<void> {
    try {
      await this.vectorClient.connect();

      // Create collections for profiles and interactions
      await this.vectorClient.createCollection(this.profileCollection, {
        dimensions: 1536,
        indexType: 'hnsw',
        distance: 'cosine',
      });

      await this.vectorClient.createCollection(this.interactionCollection, {
        dimensions: 1536,
        indexType: 'hnsw',
        distance: 'cosine',
      });

      logger.info('Personalization engine initialized');
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize personalization engine');
      throw error;
    }
  }

  /**
   * Learn from user interaction
   */
  async learnFromInteraction(interaction: UserInteraction, media: MediaItem): Promise<void> {
    try {
      // Get or create user profile
      let profile = await this.getUserProfile(interaction.userId);

      if (!profile) {
        profile = await this.createUserProfile(interaction.userId);
      }

      // Generate embedding for the media item
      const mediaEmbedding = await embeddingService.generateMediaEmbedding(media);

      // Calculate interaction weight based on type
      const interactionWeight = this.calculateInteractionWeight(interaction);

      // Update preference vector using weighted moving average
      profile.preferenceVector = this.updatePreferenceVector(
        profile.preferenceVector,
        mediaEmbedding,
        interactionWeight
      );

      // Update genre weights
      this.updateGenreWeights(profile, media.genres || [], interactionWeight);

      // Update platform preferences
      this.updatePlatformPreferences(profile, media.platforms || [], interactionWeight);

      // Update content type weights
      this.updateContentTypeWeights(profile, media.type, interactionWeight);

      // Update rating threshold based on user interactions
      if (media.rating && interactionWeight > 0) {
        profile.ratingThreshold =
          profile.ratingThreshold * this.decayFactor + media.rating * (1 - this.decayFactor);
      }

      profile.interactionCount++;
      profile.lastUpdated = new Date();

      // Save updated profile
      await this.saveUserProfile(profile);

      // Store interaction for future analysis
      await this.storeInteraction(interaction, mediaEmbedding);

      logger.debug(
        {
          userId: interaction.userId,
          mediaId: interaction.mediaId,
          interactionType: interaction.type,
          interactionCount: profile.interactionCount,
        },
        'Learned from user interaction'
      );

      // Invalidate recommendation cache
      await this.invalidateUserCache(interaction.userId);
    } catch (error) {
      logger.error({ err: error, interaction }, 'Failed to learn from interaction');
      throw error;
    }
  }

  /**
   * Get personalized recommendations for user
   */
  async getPersonalizedRecommendations(
    userId: string,
    candidates: MediaItem[],
    options: PersonalizationOptions = {}
  ): Promise<PersonalizedRecommendation[]> {
    try {
      const startTime = Date.now();

      // Get user profile
      const profile = await this.getUserProfile(userId);

      if (!profile || profile.interactionCount < 3) {
        // Not enough data for personalization, return popularity-based
        return this.getPopularityBasedRecommendations(candidates);
      }

      // Score candidates
      const scoredCandidates = await this.scoreCandidates(userId, candidates, profile, options);

      // Sort by score
      scoredCandidates.sort((a, b) => b.score - a.score);

      const processingTime = Date.now() - startTime;

      logger.info(
        {
          userId,
          candidateCount: candidates.length,
          recommendationCount: scoredCandidates.length,
          processingTime,
        },
        'Personalized recommendations generated'
      );

      return scoredCandidates;
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get personalized recommendations');
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<PersonalizationProfile | null> {
    try {
      // Check cache first
      const cacheKey = cacheService.generateKey('user_profile', userId);
      const cached = await cacheService.get<PersonalizationProfile>(cacheKey);

      if (cached) {
        return cached;
      }

      // Get from vector database
      const profileDoc = await this.vectorClient.get(this.profileCollection, userId);

      if (!profileDoc) {
        return null;
      }

      const profile: PersonalizationProfile = {
        userId,
        preferenceVector: profileDoc.vector,
        genreWeights: new Map(Object.entries(profileDoc.metadata.genreWeights || {})),
        platformPreferences: new Map(Object.entries(profileDoc.metadata.platformPreferences || {})),
        contentTypeWeights: new Map(Object.entries(profileDoc.metadata.contentTypeWeights || {})),
        ratingThreshold: profileDoc.metadata.ratingThreshold || 7.0,
        interactionCount: profileDoc.metadata.interactionCount || 0,
        lastUpdated: new Date(profileDoc.metadata.lastUpdated),
      };

      // Cache profile
      await cacheService.set(cacheKey, profile, 3600); // 1 hour

      return profile;
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get user profile');
      throw error;
    }
  }

  /**
   * Create new user profile
   */
  private async createUserProfile(userId: string): Promise<PersonalizationProfile> {
    const profile: PersonalizationProfile = {
      userId,
      preferenceVector: new Array(1536).fill(0),
      genreWeights: new Map(),
      platformPreferences: new Map(),
      contentTypeWeights: new Map(),
      ratingThreshold: 7.0,
      interactionCount: 0,
      lastUpdated: new Date(),
    };

    await this.saveUserProfile(profile);

    return profile;
  }

  /**
   * Save user profile to vector database
   */
  private async saveUserProfile(profile: PersonalizationProfile): Promise<void> {
    await this.vectorClient.upsert(this.profileCollection, [
      {
        id: profile.userId,
        vector: profile.preferenceVector,
        metadata: {
          genreWeights: Object.fromEntries(profile.genreWeights),
          platformPreferences: Object.fromEntries(profile.platformPreferences),
          contentTypeWeights: Object.fromEntries(profile.contentTypeWeights),
          ratingThreshold: profile.ratingThreshold,
          interactionCount: profile.interactionCount,
          lastUpdated: profile.lastUpdated.toISOString(),
        },
      },
    ]);

    // Update cache
    const cacheKey = cacheService.generateKey('user_profile', profile.userId);
    await cacheService.set(cacheKey, profile, 3600);
  }

  /**
   * Calculate interaction weight based on type
   */
  private calculateInteractionWeight(interaction: UserInteraction): number {
    const weights = {
      like: 1.0,
      watch: 0.8,
      view: 0.3,
      search: 0.2,
      skip: -0.5,
      dislike: -1.0,
    };

    let weight = weights[interaction.type] || 0;

    // Adjust weight based on watch duration (if available)
    if (interaction.type === 'watch' && interaction.duration) {
      const durationFactor = Math.min(interaction.duration / 1800, 1.0); // Normalize to 30 min
      weight *= durationFactor;
    }

    return weight;
  }

  /**
   * Update preference vector using weighted moving average
   */
  private updatePreferenceVector(
    currentVector: number[],
    newVector: number[],
    weight: number
  ): number[] {
    const adjustedWeight = weight * this.learningRate;

    return currentVector.map((val, idx) => {
      return val * (1 - adjustedWeight) + newVector[idx] * adjustedWeight;
    });
  }

  /**
   * Update genre weights
   */
  private updateGenreWeights(
    profile: PersonalizationProfile,
    genres: string[],
    weight: number
  ): void {
    genres.forEach(genre => {
      const currentWeight = profile.genreWeights.get(genre) || 0;
      const newWeight = currentWeight * this.decayFactor + weight * (1 - this.decayFactor);
      profile.genreWeights.set(genre, newWeight);
    });
  }

  /**
   * Update platform preferences
   */
  private updatePlatformPreferences(
    profile: PersonalizationProfile,
    platforms: any[],
    weight: number
  ): void {
    platforms.forEach(platform => {
      const currentWeight = profile.platformPreferences.get(platform.name) || 0;
      const newWeight = currentWeight * this.decayFactor + weight * (1 - this.decayFactor);
      profile.platformPreferences.set(platform.name, newWeight);
    });
  }

  /**
   * Update content type weights
   */
  private updateContentTypeWeights(
    profile: PersonalizationProfile,
    contentType: string,
    weight: number
  ): void {
    const currentWeight = profile.contentTypeWeights.get(contentType) || 0;
    const newWeight = currentWeight * this.decayFactor + weight * (1 - this.decayFactor);
    profile.contentTypeWeights.set(contentType, newWeight);
  }

  /**
   * Score candidates for personalization
   */
  private async scoreCandidates(
    userId: string,
    candidates: MediaItem[],
    profile: PersonalizationProfile,
    options: PersonalizationOptions
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    // Default weights
    const diversityWeight = options.diversityWeight || 0.2;
    const recencyWeight = options.recencyWeight || 0.1;
    const popularityWeight = options.popularityWeight || 0.1;
    const personalWeight = options.personalWeight || 0.6;

    // Generate embeddings for candidates
    const embeddingMap = await embeddingService.generateMediaEmbeddingsBatch(candidates);

    for (const candidate of candidates) {
      const embedding = embeddingMap.get(candidate.id);
      if (!embedding) continue;

      // Calculate various scores
      const personalScore = embeddingService.calculateSimilarity(
        profile.preferenceVector,
        embedding
      );

      const genreScore = this.calculateGenreScore(candidate.genres || [], profile);
      const platformScore = this.calculatePlatformScore(candidate.platforms || [], profile);
      const typeScore = profile.contentTypeWeights.get(candidate.type) || 0.5;
      const ratingScore = candidate.rating / 10;
      const recencyScore = this.calculateRecencyScore(candidate.releaseDate);

      // Weighted combined score
      const score =
        personalScore * personalWeight +
        genreScore * diversityWeight +
        ratingScore * popularityWeight +
        recencyScore * recencyWeight;

      // Generate reasons
      const reasons = this.generateReasons(candidate, profile, {
        personalScore,
        genreScore,
        platformScore,
        typeScore,
      });

      recommendations.push({
        item: candidate,
        score,
        reasons,
        confidence: this.calculateConfidence(profile.interactionCount),
      });
    }

    return recommendations;
  }

  /**
   * Calculate genre score
   */
  private calculateGenreScore(genres: string[], profile: PersonalizationProfile): number {
    if (genres.length === 0) return 0.5;

    const scores = genres.map(genre => profile.genreWeights.get(genre) || 0);
    return scores.reduce((sum, score) => sum + score, 0) / genres.length;
  }

  /**
   * Calculate platform score
   */
  private calculatePlatformScore(platforms: any[], profile: PersonalizationProfile): number {
    if (platforms.length === 0) return 0.5;

    const scores = platforms.map(p => profile.platformPreferences.get(p.name) || 0);
    return Math.max(...scores, 0);
  }

  /**
   * Calculate recency score
   */
  private calculateRecencyScore(releaseDate: string): number {
    const now = new Date();
    const release = new Date(releaseDate);
    const ageInDays = (now.getTime() - release.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: newer content gets higher score
    return Math.exp(-ageInDays / 365);
  }

  /**
   * Generate recommendation reasons
   */
  private generateReasons(
    media: MediaItem,
    profile: PersonalizationProfile,
    scores: Record<string, number>
  ): string[] {
    const reasons: string[] = [];

    if (scores.genreScore > 0.7) {
      const topGenres = media.genres?.slice(0, 2).join(' and ');
      reasons.push(`You enjoy ${topGenres} content`);
    }

    if (scores.personalScore > 0.8) {
      reasons.push('Matches your viewing preferences');
    }

    if (media.rating > profile.ratingThreshold) {
      reasons.push(`Highly rated (${media.rating}/10)`);
    }

    if (scores.platformScore > 0.7) {
      reasons.push('Available on your preferred platforms');
    }

    return reasons.slice(0, 3);
  }

  /**
   * Calculate confidence based on interaction count
   */
  private calculateConfidence(interactionCount: number): number {
    // Sigmoid function for confidence
    return 1 / (1 + Math.exp(-0.1 * (interactionCount - 20)));
  }

  /**
   * Get popularity-based recommendations (fallback)
   */
  private getPopularityBasedRecommendations(
    candidates: MediaItem[]
  ): PersonalizedRecommendation[] {
    return candidates
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 20)
      .map(item => ({
        item,
        score: item.rating / 10,
        reasons: ['Popular with other users'],
        confidence: 0.5,
      }));
  }

  /**
   * Store interaction for future analysis
   */
  private async storeInteraction(
    interaction: UserInteraction,
    embedding: number[]
  ): Promise<void> {
    const interactionId = `${interaction.userId}_${interaction.mediaId}_${Date.now()}`;

    await this.vectorClient.upsert(this.interactionCollection, [
      {
        id: interactionId,
        vector: embedding,
        metadata: {
          userId: interaction.userId,
          mediaId: interaction.mediaId,
          type: interaction.type,
          duration: interaction.duration,
          timestamp: interaction.timestamp.toISOString(),
        },
      },
    ]);
  }

  /**
   * Invalidate user cache
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    const cacheKeys = [
      cacheService.generateKey('user_profile', userId),
      cacheService.generateKey('recommendations', userId),
      cacheService.generateKey('discover', userId),
    ];

    await Promise.all(cacheKeys.map(key => cacheService.delete(key)));
  }

  /**
   * Disconnect from vector database
   */
  async disconnect(): Promise<void> {
    await this.vectorClient.disconnect();
    logger.info('Personalization engine disconnected');
  }
}

export default new PersonalizationEngine();
export type {
  UserInteraction,
  PersonalizationProfile,
  PersonalizedRecommendation,
  PersonalizationOptions,
};
