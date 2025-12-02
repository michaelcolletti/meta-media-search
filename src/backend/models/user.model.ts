import db from '../db/client.js';
import { User, UserPreferences } from '@types/index.js';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { DatabaseError, NotFoundError, ValidationError } from '../utils/errors.js';

class UserModel {
  async findById(id: string): Promise<User | null> {
    try {
      const result = await db.query<User>('SELECT * FROM users WHERE id = $1', [id]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, id }, 'Error finding user by ID');
      throw new DatabaseError('Failed to fetch user');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.query<User>('SELECT * FROM users WHERE email = $1', [email]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, email }, 'Error finding user by email');
      throw new DatabaseError('Failed to fetch user');
    }
  }

  async create(email: string, password: string, name: string): Promise<User> {
    try {
      // Check if user already exists
      const existing = await this.findByEmail(email);
      if (existing) {
        throw new ValidationError('User with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

      const result = await db.query<User>(
        `INSERT INTO users (email, password_hash, name, preferences)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [email, passwordHash, name, JSON.stringify({})]
      );

      logger.info({ userId: result.rows[0].id, email }, 'User created successfully');
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, email }, 'Error creating user');
      if (error instanceof ValidationError) throw error;
      throw new DatabaseError('Failed to create user');
    }
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      logger.error({ err: error, userId: user.id }, 'Error verifying password');
      return false;
    }
  }

  async updatePreferences(id: string, preferences: UserPreferences): Promise<User> {
    try {
      const result = await db.query<User>(
        `UPDATE users SET preferences = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [JSON.stringify(preferences), id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('User', id);
      }

      logger.info({ userId: id }, 'User preferences updated');
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, id }, 'Error updating user preferences');
      throw new DatabaseError('Failed to update user preferences');
    }
  }

  async addToWatchHistory(userId: string, mediaId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE users
         SET watch_history = array_append(
           CASE WHEN $2 = ANY(watch_history)
                THEN array_remove(watch_history, $2)
                ELSE watch_history
           END, $2
         ), updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId, mediaId]
      );

      logger.debug({ userId, mediaId }, 'Added to watch history');
    } catch (error) {
      logger.error({ err: error, userId, mediaId }, 'Error adding to watch history');
      throw new DatabaseError('Failed to update watch history');
    }
  }

  async toggleFavorite(userId: string, mediaId: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundError('User', userId);
      }

      const isFavorite = user.favorites.includes(mediaId);

      if (isFavorite) {
        await db.query(
          `UPDATE users SET favorites = array_remove(favorites, $2),
           updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [userId, mediaId]
        );
      } else {
        await db.query(
          `UPDATE users SET favorites = array_append(favorites, $2),
           updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [userId, mediaId]
        );
      }

      logger.debug({ userId, mediaId, isFavorite: !isFavorite }, 'Toggled favorite');
      return !isFavorite;
    } catch (error) {
      logger.error({ err: error, userId, mediaId }, 'Error toggling favorite');
      throw new DatabaseError('Failed to update favorites');
    }
  }

  async getWatchHistory(userId: string): Promise<string[]> {
    try {
      const result = await db.query<{ watch_history: string[] }>(
        'SELECT watch_history FROM users WHERE id = $1',
        [userId]
      );

      return result.rows[0]?.watch_history || [];
    } catch (error) {
      logger.error({ err: error, userId }, 'Error fetching watch history');
      throw new DatabaseError('Failed to fetch watch history');
    }
  }

  async getFavorites(userId: string): Promise<string[]> {
    try {
      const result = await db.query<{ favorites: string[] }>(
        'SELECT favorites FROM users WHERE id = $1',
        [userId]
      );

      return result.rows[0]?.favorites || [];
    } catch (error) {
      logger.error({ err: error, userId }, 'Error fetching favorites');
      throw new DatabaseError('Failed to fetch favorites');
    }
  }
}

export default new UserModel();
