import { Request, Response } from 'express';
import db from '../db/client.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import cacheService from '../services/cache.service.js';

export const getPlatforms = asyncHandler(async (req: Request, res: Response) => {
  const cacheKey = cacheService.generateKey('platforms', 'all');
  const cached = await cacheService.get(cacheKey);

  if (cached) {
    return res.json({
      success: true,
      data: cached,
    });
  }

  const result = await db.query(
    `SELECT id, name, type, logo, metadata
     FROM platforms
     ORDER BY name ASC`
  );

  const platforms = result.rows;
  await cacheService.set(cacheKey, platforms, 86400); // Cache for 24 hours

  res.json({
    success: true,
    data: platforms,
  });
});

export const getPlatformById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const cacheKey = cacheService.generateKey('platform', id);
  const cached = await cacheService.get(cacheKey);

  if (cached) {
    return res.json({
      success: true,
      data: cached,
    });
  }

  const result = await db.query(
    `SELECT p.*,
            COUNT(mp.media_id) as content_count
     FROM platforms p
     LEFT JOIN media_platforms mp ON p.id = mp.platform_id
     WHERE p.id = $1
     GROUP BY p.id`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Platform not found',
      },
    });
  }

  const platform = result.rows[0];
  await cacheService.set(cacheKey, platform, 86400);

  res.json({
    success: true,
    data: platform,
  });
});
