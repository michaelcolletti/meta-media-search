import { Router } from 'express';
import * as searchController from '../controllers/search.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { searchRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * @route   GET /api/search
 * @desc    Search for media content using natural language
 * @access  Public (authenticated users get personalized results)
 * @query   q - Search query string
 * @query   limit - Number of results (default: 20)
 * @query   offset - Pagination offset (default: 0)
 */
router.get('/', searchRateLimiter, optionalAuth, searchController.search);

/**
 * @route   POST /api/search
 * @desc    Advanced search with filters
 * @access  Public
 * @body    { query, filters: { type, genres, platforms, minRating, releaseYearMin, releaseYearMax } }
 */
router.post('/', searchRateLimiter, optionalAuth, searchController.search);

/**
 * @route   GET /api/search/discover
 * @desc    Discover new content based on trends or user preferences
 * @access  Public (personalized for authenticated users)
 * @query   limit - Number of results (default: 20)
 */
router.get('/discover', optionalAuth, searchController.discover);

export default router;
