import { Response } from 'express';
import recommendationService from '../services/recommendation.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { recommendationRequestSchema } from '../utils/validators.js';
import { AuthRequest } from '../middleware/auth.js';
import { AuthenticationError } from '../utils/errors.js';

export const getRecommendations = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    throw new AuthenticationError('Authentication required for recommendations');
  }

  const validated = recommendationRequestSchema.parse({
    userId: req.user.id,
    basedOn: req.body.basedOn,
    limit: req.body.limit || req.query.limit,
    diversityFactor: req.body.diversityFactor,
  });

  const result = await recommendationService.getRecommendations(validated);

  res.json({
    success: true,
    data: result,
  });
});
