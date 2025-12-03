import { Router, Request, Response } from 'express';
import { DiscoveryEngine } from '../services/discoveryEngine.js';

const router = Router();
const discoveryEngine = new DiscoveryEngine();

/**
 * POST /api/discover
 * AI-powered content discovery
 *
 * @body {object} context - Discovery context (mood, time, companions, etc.)
 * @body {object} preferences - User preferences
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { context = {}, preferences = {} } = req.body;

    const discoveries = await discoveryEngine.discover({
      context,
      preferences
    });

    res.json({
      discoveries,
      visualMap: await discoveryEngine.generateMapView(discoveries),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Discovery error:', error);
    res.status(500).json({
      error: 'Discovery failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as discoverRouter };
