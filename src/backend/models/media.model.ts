import db from '../db/client.js';
import { MediaItem, SearchFilters, PaginationParams } from '@types/index.js';
import logger from '../utils/logger.js';
import { DatabaseError, NotFoundError } from '../utils/errors.js';

class MediaModel {
  async findById(id: string): Promise<MediaItem | null> {
    try {
      const result = await db.query<MediaItem>(
        `SELECT m.*,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', p.id,
                      'name', p.name,
                      'type', p.type,
                      'logo', p.logo,
                      'url', mp.url,
                      'price', mp.price,
                      'currency', mp.currency,
                      'quality', mp.quality,
                      'available', mp.available
                    )
                  ) FILTER (WHERE p.id IS NOT NULL), '[]'
                ) as platforms
         FROM media_items m
         LEFT JOIN media_platforms mp ON m.id = mp.media_id
         LEFT JOIN platforms p ON mp.platform_id = p.id
         WHERE m.id = $1
         GROUP BY m.id`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, id }, 'Error finding media by ID');
      throw new DatabaseError('Failed to fetch media item');
    }
  }

  async search(
    filters: SearchFilters,
    pagination: PaginationParams
  ): Promise<{
    items: MediaItem[];
    total: number;
  }> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      if (filters.type && filters.type.length > 0) {
        conditions.push(`m.type = ANY($${paramCount})`);
        params.push(filters.type);
        paramCount++;
      }

      if (filters.genres && filters.genres.length > 0) {
        conditions.push(`m.genres && $${paramCount}`);
        params.push(filters.genres);
        paramCount++;
      }

      if (filters.minRating !== undefined) {
        conditions.push(`m.rating >= $${paramCount}`);
        params.push(filters.minRating);
        paramCount++;
      }

      if (filters.releaseYearMin !== undefined) {
        conditions.push(`EXTRACT(YEAR FROM m.release_date) >= $${paramCount}`);
        params.push(filters.releaseYearMin);
        paramCount++;
      }

      if (filters.releaseYearMax !== undefined) {
        conditions.push(`EXTRACT(YEAR FROM m.release_date) <= $${paramCount}`);
        params.push(filters.releaseYearMax);
        paramCount++;
      }

      if (filters.platforms && filters.platforms.length > 0) {
        conditions.push(`EXISTS (
          SELECT 1 FROM media_platforms mp
          JOIN platforms p ON mp.platform_id = p.id
          WHERE mp.media_id = m.id AND p.name = ANY($${paramCount})
        )`);
        params.push(filters.platforms);
        paramCount++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total FROM media_items m ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const offset = (pagination.page - 1) * pagination.limit;
      params.push(pagination.limit, offset);

      const sortColumn = pagination.sortBy || 'rating';
      const sortOrder = pagination.sortOrder || 'DESC';

      const result = await db.query<MediaItem>(
        `SELECT m.*,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', p.id,
                      'name', p.name,
                      'type', p.type,
                      'logo', p.logo
                    )
                  ) FILTER (WHERE p.id IS NOT NULL), '[]'
                ) as platforms
         FROM media_items m
         LEFT JOIN media_platforms mp ON m.id = mp.media_id
         LEFT JOIN platforms p ON mp.platform_id = p.id
         ${whereClause}
         GROUP BY m.id
         ORDER BY m.${sortColumn} ${sortOrder}
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        params
      );

      return {
        items: result.rows,
        total,
      };
    } catch (error) {
      logger.error({ err: error, filters }, 'Error searching media');
      throw new DatabaseError('Failed to search media items');
    }
  }

  async searchBySimilarity(embedding: number[], limit: number): Promise<MediaItem[]> {
    try {
      const result = await db.query<MediaItem>(
        `SELECT m.*,
                1 - (m.embedding <=> $1::vector) as similarity,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', p.id,
                      'name', p.name,
                      'type', p.type,
                      'logo', p.logo
                    )
                  ) FILTER (WHERE p.id IS NOT NULL), '[]'
                ) as platforms
         FROM media_items m
         LEFT JOIN media_platforms mp ON m.id = mp.media_id
         LEFT JOIN platforms p ON mp.platform_id = p.id
         WHERE m.embedding IS NOT NULL
         GROUP BY m.id, m.embedding
         ORDER BY m.embedding <=> $1::vector
         LIMIT $2`,
        [`[${embedding.join(',')}]`, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error({ err: error }, 'Error searching by similarity');
      throw new DatabaseError('Failed to search by similarity');
    }
  }

  async create(media: Partial<MediaItem>): Promise<MediaItem> {
    try {
      const result = await db.query<MediaItem>(
        `INSERT INTO media_items (
          id, title, type, description, genres, release_date,
          rating, thumbnail, poster_url, backdrop_url, trailer_url,
          director, duration, seasons, episodes, embedding, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          media.id,
          media.title,
          media.type,
          media.description,
          media.genres,
          media.releaseDate,
          media.rating,
          media.thumbnail,
          media.posterUrl,
          media.backdropUrl,
          media.trailerUrl,
          media.director,
          media.duration,
          media.seasons,
          media.episodes,
          media.embedding ? `[${media.embedding.join(',')}]` : null,
          JSON.stringify(media.metadata),
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, media }, 'Error creating media item');
      throw new DatabaseError('Failed to create media item');
    }
  }

  async update(id: string, updates: Partial<MediaItem>): Promise<MediaItem> {
    try {
      const fields: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          fields.push(`${key} = $${paramCount}`);
          params.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      params.push(id);
      const result = await db.query<MediaItem>(
        `UPDATE media_items SET ${fields.join(', ')}
         WHERE id = $${paramCount} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Media item', id);
      }

      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, id, updates }, 'Error updating media item');
      throw new DatabaseError('Failed to update media item');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await db.query('DELETE FROM media_items WHERE id = $1', [id]);

      if (result.rowCount === 0) {
        throw new NotFoundError('Media item', id);
      }
    } catch (error) {
      logger.error({ err: error, id }, 'Error deleting media item');
      throw new DatabaseError('Failed to delete media item');
    }
  }

  async getTrending(limit: number, type?: string): Promise<MediaItem[]> {
    try {
      const typeFilter = type ? `WHERE type = $2` : '';
      const params = type ? [limit, type] : [limit];

      const result = await db.query<MediaItem>(
        `SELECT m.*,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', p.id,
                      'name', p.name,
                      'type', p.type,
                      'logo', p.logo
                    )
                  ) FILTER (WHERE p.id IS NOT NULL), '[]'
                ) as platforms
         FROM media_items m
         LEFT JOIN media_platforms mp ON m.id = mp.media_id
         LEFT JOIN platforms p ON mp.platform_id = p.id
         ${typeFilter}
         GROUP BY m.id
         ORDER BY m.rating DESC, m.created_at DESC
         LIMIT $1`,
        params
      );

      return result.rows;
    } catch (error) {
      logger.error({ err: error }, 'Error fetching trending media');
      throw new DatabaseError('Failed to fetch trending media');
    }
  }
}

export default new MediaModel();
