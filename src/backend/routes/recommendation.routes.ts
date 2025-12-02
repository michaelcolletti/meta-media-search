import { Router } from 'express';
import * as recommendationController from '../controllers/recommendation.controller.js';
import { authenticate } from '../middleware/auth.js';
import { recommendationRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * @route   GET /api/recommendations
 * @desc    Get personalized recommendations
 * @access  Private (requires authentication)
 * @query   limit - Number of recommendations (default: 10)
 */
router.get(
  '/',
  recommendationRateLimiter,
  authenticate,
  recommendationController.getRecommendations
);

/**
 * @route   POST /api/recommendations
 * @desc    Get recommendations with custom parameters
 * @access  Private
 * @body    { basedOn?: string[], limit?: number, diversityFactor?: number }
 */
router.post(
  '/',
  recommendationRateLimiter,
  authenticate,
  recommendationController.getRecommendations
);

export default router;
