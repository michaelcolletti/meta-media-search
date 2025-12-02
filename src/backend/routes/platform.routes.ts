import { Router } from 'express';
import * as platformController from '../controllers/platform.controller.js';

const router = Router();

/**
 * @route   GET /api/platforms
 * @desc    Get all available streaming platforms
 * @access  Public
 */
router.get('/', platformController.getPlatforms);

/**
 * @route   GET /api/platforms/:id
 * @desc    Get platform details by ID
 * @access  Public
 */
router.get('/:id', platformController.getPlatformById);

export default router;
