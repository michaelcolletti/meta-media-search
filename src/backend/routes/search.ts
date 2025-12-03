import { Router, Request, Response } from 'express';
import { AIQueryProcessor } from '../services/aiQueryProcessor.js';
import { ContentAggregator } from '../services/contentAggregator.js';

const router = Router();
const aiProcessor = new AIQueryProcessor();
const contentAggregator = new ContentAggregator();

/**
 * POST /api/search
 * Natural language media search
 *
 * @body {string} query - Natural language query (e.g., "funny sci-fi movies like The Martian")
 * @body {object} filters - Optional filters (genre, platform, year, etc.)
 * @body {object} userPreferences - Optional user preferences for personalization
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { query, filters = {}, userPreferences = {} } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query is required and must be a string'
      });
    }

    // Process natural language query with AI
    const processedQuery = await aiProcessor.processQuery(query, userPreferences);

    // Search across content sources
    const results = await contentAggregator.search({
      ...processedQuery,
      ...filters
    });

    // Generate visual map data
    const visualMapData = await contentAggregator.generateMapData(results);

    res.json({
      query: {
        original: query,
        processed: processedQuery
      },
      results: {
        total: results.length,
        items: results
      },
      visualMap: visualMapData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as searchRouter };
