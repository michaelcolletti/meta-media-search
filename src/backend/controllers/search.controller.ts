import { Request, Response } from 'express';
import searchService from '../services/search.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { searchQuerySchema } from '../utils/validators.js';
import { SearchQuery } from '@types/index.js';
import { AuthRequest } from '../middleware/auth.js';

export const search = asyncHandler(async (req: AuthRequest, res: Response) => {
  const validated = searchQuerySchema.parse({
    query: req.query.q || req.body.query,
    userId: req.user?.id,
    filters: req.body.filters,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
  });

  const result = await searchService.search(validated);

  res.json({
    success: true,
    data: result,
  });
});

export const discover = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  const items = await searchService.discover(req.user?.id, limit);

  res.json({
    success: true,
    data: {
      items,
      total: items.length,
    },
  });
});
