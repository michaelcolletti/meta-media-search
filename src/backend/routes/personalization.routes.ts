/**
 * Personalization Routes
 * API endpoints for personalized content and user profile management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import personalizationEngine from '../../personalization/engine.js';
import userProfileService from '../../personalization/user-profile.js';
import vectorSearchService from '../services/vector-search.service.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

const router = Router();

/**
 * Validation middleware
 */
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, { errors: errors.array() });
  }
  next();
};

/**
 * GET /api/v1/personalization/profile
 * Get user profile with personalization analytics
 */
router.get(
  '/profile',
  authenticate,
  rateLimiter({ maxRequests: 60, windowMs: 60000 }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const profile = await userProfileService.getUserProfile(userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/personalization/preferences
 * Update user preferences
 */
router.put(
  '/preferences',
  authenticate,
  rateLimiter({ maxRequests: 30, windowMs: 60000 }),
  [
    body('genres').optional().isArray(),
    body('platforms').optional().isArray(),
    body('contentTypes').optional().isArray(),
    body('minRating').optional().isFloat({ min: 0, max: 10 }),
    body('excludeMature').optional().isBoolean(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const updates = req.body;
      const updatedPreferences = await userProfileService.updatePreferences(userId, updates);

      logger.info({ userId, updates }, 'User preferences updated');

      res.json({
        success: true,
        data: updatedPreferences,
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/personalization/interactions
 * Track user interaction with media
 */
router.post(
  '/interactions',
  authenticate,
  rateLimiter({ maxRequests: 100, windowMs: 60000 }),
  [
    body('mediaId').isString().notEmpty(),
    body('type').isIn(['view', 'like', 'dislike', 'watch', 'skip', 'search']),
    body('duration').optional().isInt({ min: 0 }),
    body('metadata').optional().isObject(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { mediaId, type, duration, metadata } = req.body;

      await userProfileService.trackInteraction(userId, {
        mediaId,
        type,
        duration,
        metadata,
      });

      res.json({
        success: true,
        message: 'Interaction tracked successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/personalization/recommendations
 * Get personalized recommendations
 */
router.get(
  '/recommendations',
  authenticate,
  rateLimiter({ maxRequests: 30, windowMs: 60000 }),
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('diversityWeight').optional().isFloat({ min: 0, max: 1 }),
    query('recencyWeight').optional().isFloat({ min: 0, max: 1 }),
    query('popularityWeight').optional().isFloat({ min: 0, max: 1 }),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const options = {
        diversityWeight: parseFloat(req.query.diversityWeight as string) || 0.2,
        recencyWeight: parseFloat(req.query.recencyWeight as string) || 0.1,
        popularityWeight: parseFloat(req.query.popularityWeight as string) || 0.1,
      };

      // Get candidate media items (this would normally come from a more sophisticated source)
      const candidates: any[] = []; // TODO: Fetch from media model

      const recommendations = await personalizationEngine.getPersonalizedRecommendations(
        userId,
        candidates,
        options
      );

      res.json({
        success: true,
        data: {
          recommendations: recommendations.slice(0, limit),
          total: recommendations.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/personalization/similar/:mediaId
 * Get similar content based on media item
 */
router.get(
  '/similar/:mediaId',
  rateLimiter({ maxRequests: 60, windowMs: 60000 }),
  [
    param('mediaId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('excludeWatched').optional().isBoolean(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mediaId } = req.params;
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const excludeWatched = req.query.excludeWatched === 'true';

      const similarContent = await vectorSearchService.findSimilarContent({
        mediaId,
        limit,
        excludeWatched,
        userId,
      });

      res.json({
        success: true,
        data: {
          items: similarContent,
          total: similarContent.length,
          sourceMediaId: mediaId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/personalization/search/hybrid
 * Hybrid search with vector similarity
 */
router.post(
  '/search/hybrid',
  rateLimiter({ maxRequests: 30, windowMs: 60000 }),
  [
    body('query').isString().notEmpty(),
    body('limit').optional().isInt({ min: 1, max: 100 }),
    body('offset').optional().isInt({ min: 0 }),
    body('hybridWeight').optional().isFloat({ min: 0, max: 1 }),
    body('filters').optional().isObject(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, limit, offset, hybridWeight, filters } = req.body;

      const result = await vectorSearchService.hybridSearch(query, {
        limit,
        offset,
        hybridWeight,
        filters,
      });

      res.json({
        success: true,
        data: result,
        query,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/personalization/analytics
 * Get user analytics and insights
 */
router.get(
  '/analytics',
  authenticate,
  rateLimiter({ maxRequests: 30, windowMs: 60000 }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const [stats, completeness] = await Promise.all([
        userProfileService.getInteractionStats(userId),
        userProfileService.getProfileCompleteness(userId),
      ]);

      res.json({
        success: true,
        data: {
          interactionStats: stats,
          profileCompleteness: completeness,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/personalization/export
 * Export user data (GDPR compliance)
 */
router.get(
  '/export',
  authenticate,
  rateLimiter({ maxRequests: 5, windowMs: 3600000 }), // 5 requests per hour
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const userData = await userProfileService.exportUserData(userId);

      logger.info({ userId }, 'User data exported');

      res.json({
        success: true,
        data: userData,
        message: 'User data exported successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/personalization/profile
 * Delete user profile and data (GDPR compliance)
 */
router.delete(
  '/profile',
  authenticate,
  rateLimiter({ maxRequests: 3, windowMs: 3600000 }), // 3 requests per hour
  [body('confirmDelete').equals('true')],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      await userProfileService.deleteUserProfile(userId);

      logger.warn({ userId }, 'User profile deleted');

      res.json({
        success: true,
        message: 'Profile deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/personalization/vector/stats
 * Get vector index statistics (admin only)
 */
router.get(
  '/vector/stats',
  authenticate,
  rateLimiter({ maxRequests: 10, windowMs: 60000 }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: Add admin check middleware
      const stats = await vectorSearchService.getIndexStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
