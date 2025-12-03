import { Router, Request, Response } from 'express';
import { RecommendationEngine } from '../services/recommendationEngine.js';

const router = Router();
const recommendationEngine = new RecommendationEngine();

/**
 * POST /api/recommendations
 * Personalized content recommendations
 *
 * @body {string} userId - User identifier
 * @body {number} limit - Number of recommendations (default: 20)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, limit = 20 } = req.body;

    const recommendations = await recommendationEngine.getRecommendations({
      userId,
      limit
    });

    res.json({
      recommendations,
      visualMap: await recommendationEngine.generateMapView(recommendations),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({
      error: 'Recommendations failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as recommendationsRouter };
