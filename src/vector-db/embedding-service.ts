/**
 * Embedding Service
 * Handles embedding generation and batch processing for vector storage
 */

import { OpenAI } from 'openai';
import aiService from '../backend/services/ai.service.js';
import logger from '../backend/utils/logger.js';
import config from '../backend/config/index.js';
import { MediaItem } from '@types/index.js';

interface EmbeddingOptions {
  model?: string;
  batchSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

interface BatchEmbeddingResult {
  embeddings: number[][];
  texts: string[];
  totalTokens: number;
  processingTime: number;
}

interface EmbeddingMetadata {
  model: string;
  dimensions: number;
  generatedAt: Date;
  tokens?: number;
}

/**
 * Service for generating and managing embeddings
 */
class EmbeddingService {
  private openai: OpenAI | null = null;
  private readonly defaultModel = 'text-embedding-3-small';
  private readonly defaultBatchSize = 100;
  private readonly embeddingDimensions = 1536;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      if (config.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: config.OPENAI_API_KEY,
        });
        logger.info('OpenAI client initialized for embedding generation');
      } else {
        logger.warn('OpenAI API key not found. Embedding generation will use fallback.');
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize OpenAI client');
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<{ embedding: number[]; metadata: EmbeddingMetadata }> {
    try {
      const model = options.model || this.defaultModel;
      const startTime = Date.now();

      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Truncate text if too long (OpenAI has a 8191 token limit)
      const truncatedText = this.truncateText(text, 8000);

      let embedding: number[];
      let tokens = 0;

      if (this.openai) {
        // Use OpenAI API
        const response = await this.openai.embeddings.create({
          model,
          input: truncatedText,
        });

        embedding = response.data[0].embedding;
        tokens = response.usage.total_tokens;
      } else {
        // Fallback to local embedding generation
        embedding = await aiService.generateEmbedding(truncatedText);
      }

      const processingTime = Date.now() - startTime;

      logger.debug(
        {
          textLength: text.length,
          tokens,
          model,
          processingTime,
        },
        'Embedding generated'
      );

      return {
        embedding,
        metadata: {
          model,
          dimensions: embedding.length,
          generatedAt: new Date(),
          tokens,
        },
      };
    } catch (error) {
      logger.error({ err: error, textPreview: text.substring(0, 100) }, 'Embedding generation failed');
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateBatchEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<BatchEmbeddingResult> {
    try {
      const startTime = Date.now();
      const batchSize = options.batchSize || this.defaultBatchSize;
      const model = options.model || this.defaultModel;

      const embeddings: number[][] = [];
      let totalTokens = 0;

      // Process in batches
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const truncatedBatch = batch.map(text => this.truncateText(text, 8000));

        if (this.openai) {
          // Use OpenAI batch API
          const response = await this.openai.embeddings.create({
            model,
            input: truncatedBatch,
          });

          embeddings.push(...response.data.map(item => item.embedding));
          totalTokens += response.usage.total_tokens;
        } else {
          // Fallback to sequential generation
          for (const text of truncatedBatch) {
            const embedding = await aiService.generateEmbedding(text);
            embeddings.push(embedding);
          }
        }

        logger.debug(
          {
            batch: i / batchSize + 1,
            totalBatches: Math.ceil(texts.length / batchSize),
            processed: Math.min(i + batchSize, texts.length),
            total: texts.length,
          },
          'Batch embeddings progress'
        );
      }

      const processingTime = Date.now() - startTime;

      logger.info(
        {
          totalTexts: texts.length,
          totalTokens,
          processingTime,
          avgTimePerText: processingTime / texts.length,
        },
        'Batch embeddings completed'
      );

      return {
        embeddings,
        texts,
        totalTokens,
        processingTime,
      };
    } catch (error) {
      logger.error({ err: error, textCount: texts.length }, 'Batch embedding generation failed');
      throw error;
    }
  }

  /**
   * Generate embedding for media item
   */
  async generateMediaEmbedding(media: MediaItem): Promise<number[]> {
    try {
      // Create rich text representation of media
      const embeddingText = this.createMediaEmbeddingText(media);

      const { embedding } = await this.generateEmbedding(embeddingText);

      return embedding;
    } catch (error) {
      logger.error({ err: error, mediaId: media.id }, 'Failed to generate media embedding');
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple media items
   */
  async generateMediaEmbeddingsBatch(media: MediaItem[]): Promise<Map<string, number[]>> {
    try {
      // Create embedding texts for all media items
      const embeddingTexts = media.map(item => this.createMediaEmbeddingText(item));

      // Generate embeddings in batch
      const { embeddings } = await this.generateBatchEmbeddings(embeddingTexts);

      // Map embeddings back to media IDs
      const embeddingMap = new Map<string, number[]>();
      media.forEach((item, index) => {
        embeddingMap.set(item.id, embeddings[index]);
      });

      logger.info(
        { mediaCount: media.length },
        'Media embeddings batch generation completed'
      );

      return embeddingMap;
    } catch (error) {
      logger.error({ err: error, mediaCount: media.length }, 'Failed to generate media embeddings batch');
      throw error;
    }
  }

  /**
   * Create embedding text from media item
   */
  private createMediaEmbeddingText(media: MediaItem): string {
    const parts: string[] = [];

    // Title and type
    parts.push(`Title: ${media.title}`);
    parts.push(`Type: ${media.type}`);

    // Description
    if (media.description) {
      parts.push(`Description: ${media.description}`);
    }

    // Genres
    if (media.genres && media.genres.length > 0) {
      parts.push(`Genres: ${media.genres.join(', ')}`);
    }

    // Cast and director
    if (media.cast && media.cast.length > 0) {
      const castNames = media.cast.slice(0, 5).map(c => c.name);
      parts.push(`Cast: ${castNames.join(', ')}`);
    }

    if (media.director) {
      parts.push(`Director: ${media.director}`);
    }

    // Year and rating
    if (media.releaseDate) {
      const year = new Date(media.releaseDate).getFullYear();
      parts.push(`Year: ${year}`);
    }

    if (media.rating) {
      parts.push(`Rating: ${media.rating}/10`);
    }

    // Platforms
    if (media.platforms && media.platforms.length > 0) {
      const platformNames = media.platforms.map(p => p.name);
      parts.push(`Available on: ${platformNames.join(', ')}`);
    }

    // Additional metadata
    if (media.duration) {
      parts.push(`Duration: ${media.duration} minutes`);
    }

    if (media.seasons) {
      parts.push(`Seasons: ${media.seasons}`);
    }

    return parts.join('. ');
  }

  /**
   * Truncate text to specified token limit
   */
  private truncateText(text: string, maxTokens: number): string {
    // Rough approximation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;

    if (text.length <= maxChars) {
      return text;
    }

    // Truncate and add ellipsis
    return text.substring(0, maxChars - 3) + '...';
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    const dotProduct = embedding1.reduce((sum, val, idx) => sum + val * embedding2[idx], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Get embedding dimensions
   */
  getDimensions(): number {
    return this.embeddingDimensions;
  }

  /**
   * Validate embedding
   */
  validateEmbedding(embedding: number[]): boolean {
    if (!Array.isArray(embedding)) {
      return false;
    }

    if (embedding.length !== this.embeddingDimensions) {
      return false;
    }

    // Check for valid numbers
    return embedding.every(val => typeof val === 'number' && !isNaN(val) && isFinite(val));
  }
}

export default new EmbeddingService();
export type { EmbeddingOptions, BatchEmbeddingResult, EmbeddingMetadata };
