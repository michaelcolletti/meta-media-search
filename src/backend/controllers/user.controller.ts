import { Request, Response } from 'express';
import userModel from '../models/user.model.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateToken, AuthRequest } from '../middleware/auth.js';
import {
  userRegistrationSchema,
  userLoginSchema,
  userPreferencesSchema,
} from '../utils/validators.js';
import { AuthenticationError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const validated = userRegistrationSchema.parse(req.body);

  const user = await userModel.create(validated.email, validated.password, validated.name);

  const token = generateToken({
    id: user.id,
    email: user.email,
  });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const validated = userLoginSchema.parse(req.body);

  const user = await userModel.findByEmail(validated.email);
  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  const isValidPassword = await userModel.verifyPassword(user, validated.password);
  if (!isValidPassword) {
    throw new AuthenticationError('Invalid email or password');
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        preferences: user.preferences,
      },
      token,
    },
  });
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    throw new AuthenticationError();
  }

  const user = await userModel.findById(req.user.id);
  if (!user) {
    throw new AuthenticationError('User not found');
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      preferences: user.preferences,
      createdAt: user.createdAt,
    },
  });
});

export const updatePreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    throw new AuthenticationError();
  }

  const validated = userPreferencesSchema.parse(req.body);

  const user = await userModel.updatePreferences(req.user.id, validated);

  res.json({
    success: true,
    data: {
      preferences: user.preferences,
    },
  });
});

export const toggleFavorite = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    throw new AuthenticationError();
  }

  const { mediaId } = req.params;
  if (!mediaId) {
    throw new ValidationError('Media ID is required');
  }

  const isFavorite = await userModel.toggleFavorite(req.user.id, mediaId);

  res.json({
    success: true,
    data: {
      mediaId,
      isFavorite,
    },
  });
});

export const getWatchHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    throw new AuthenticationError();
  }

  const history = await userModel.getWatchHistory(req.user.id);

  res.json({
    success: true,
    data: {
      history,
    },
  });
});

export const getFavorites = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    throw new AuthenticationError();
  }

  const favorites = await userModel.getFavorites(req.user.id);

  res.json({
    success: true,
    data: {
      favorites,
    },
  });
});
