import { Router } from 'express';
import searchRoutes from './search.routes.js';
import recommendationRoutes from './recommendation.routes.js';
import userRoutes from './user.routes.js';
import platformRoutes from './platform.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// API routes
router.use('/search', searchRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/user', userRoutes);
router.use('/platforms', platformRoutes);

export default router;
