import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * @route   POST /api/user/register
 * @desc    Register a new user
 * @access  Public
 * @body    { email, password, name }
 */
router.post('/register', authRateLimiter, userController.register);

/**
 * @route   POST /api/user/login
 * @desc    Login user
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', authRateLimiter, userController.login);

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/user/preferences
 * @desc    Update user preferences
 * @access  Private
 * @body    { genres, platforms, contentTypes, languages, minRating, excludeMature }
 */
router.put('/preferences', authenticate, userController.updatePreferences);

/**
 * @route   POST /api/user/favorites/:mediaId
 * @desc    Toggle favorite status for media item
 * @access  Private
 */
router.post('/favorites/:mediaId', authenticate, userController.toggleFavorite);

/**
 * @route   GET /api/user/favorites
 * @desc    Get user's favorite media items
 * @access  Private
 */
router.get('/favorites', authenticate, userController.getFavorites);

/**
 * @route   GET /api/user/history
 * @desc    Get user's watch history
 * @access  Private
 */
router.get('/history', authenticate, userController.getWatchHistory);

export default router;
