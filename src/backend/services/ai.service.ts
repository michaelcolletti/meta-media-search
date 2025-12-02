import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AIQuery, AIResponse, SearchFilters } from '@types/index.js';
import { ExternalAPIError } from '../utils/errors.js';

class AIService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;

  constructor() {
    if (config.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    }
    if (config.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    }

    if (!this.openai && !this.anthropic) {
      logger.warn('No AI service API keys configured');
    }
  }

  async processNaturalLanguageQuery(aiQuery: AIQuery): Promise<AIResponse> {
    try {
      const systemPrompt = `You are an AI assistant that helps users find movies, TV shows, and other media content.
Analyze the user's natural language query and extract structured search filters.

Return a JSON response with:
- interpretation: A brief explanation of what you understood
- extractedFilters: Object with type[], genres[], platforms[], minRating, releaseYearMin, releaseYearMax, language
- suggestedPlatforms: Array of platform names where content might be available
- confidence: Number 0-1 indicating confidence in understanding
- needsClarification: Boolean if query is ambiguous
- clarificationQuestions: Array of questions if clarification needed

Example:
User: "Find me action movies from the 90s on Netflix with good ratings"
Response: {
  "interpretation": "Looking for action movies from the 1990s available on Netflix with high ratings",
  "extractedFilters": {
    "type": ["movie"],
    "genres": ["action"],
    "platforms": ["netflix"],
    "minRating": 7.0,
    "releaseYearMin": 1990,
    "releaseYearMax": 1999
  },
  "suggestedPlatforms": ["netflix"],
  "confidence": 0.95,
  "needsClarification": false
}`;

      const userMessage = this.buildUserMessage(aiQuery);

      let responseText: string;

      if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: config.AI_MAX_TOKENS,
          temperature: config.AI_TEMPERATURE,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });

        responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: config.AI_MODEL,
          temperature: config.AI_TEMPERATURE,
          max_tokens: config.AI_MAX_TOKENS,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
        });

        responseText = response.choices[0]?.message?.content || '{}';
      } else {
        throw new ExternalAPIError('AI Service', 'No AI service configured');
      }

      const parsed = JSON.parse(responseText) as AIResponse;
      logger.info({ query: aiQuery.userQuery, response: parsed }, 'NLP query processed');

      return parsed;
    } catch (error) {
      logger.error({ err: error, query: aiQuery }, 'AI query processing error');
      throw new ExternalAPIError('AI Service', 'Failed to process natural language query');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.openai) {
        throw new ExternalAPIError('OpenAI', 'OpenAI not configured for embeddings');
      }

      const response = await this.openai.embeddings.create({
        model: config.EMBEDDING_MODEL,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error({ err: error, text }, 'Embedding generation error');
      throw new ExternalAPIError('OpenAI', 'Failed to generate embedding');
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (!this.openai) {
        throw new ExternalAPIError('OpenAI', 'OpenAI not configured for embeddings');
      }

      const response = await this.openai.embeddings.create({
        model: config.EMBEDDING_MODEL,
        input: texts,
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      logger.error({ err: error, count: texts.length }, 'Batch embedding error');
      throw new ExternalAPIError('OpenAI', 'Failed to generate batch embeddings');
    }
  }

  async generateRecommendationExplanation(
    items: Array<{ title: string; type: string; genres: string[] }>,
    factors: Record<string, number>
  ): Promise<string> {
    try {
      const prompt = `Generate a brief, natural explanation for why these media items are recommended:

Items: ${JSON.stringify(items)}
Matching Factors: ${JSON.stringify(factors)}

Provide a 2-3 sentence explanation that's user-friendly and highlights the key reasons.`;

      if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        });

        return response.content[0].type === 'text' ? response.content[0].text : '';
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: config.AI_MODEL,
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        });

        return response.choices[0]?.message?.content || 'Recommended based on your preferences.';
      }

      return 'These items match your viewing preferences and interests.';
    } catch (error) {
      logger.error({ err: error }, 'Recommendation explanation generation error');
      return 'Recommended based on your viewing history and preferences.';
    }
  }

  private buildUserMessage(aiQuery: AIQuery): string {
    let message = `User Query: "${aiQuery.userQuery}"`;

    if (aiQuery.context?.preferences) {
      message += `\n\nUser Preferences:
- Favorite Genres: ${aiQuery.context.preferences.genres.join(', ')}
- Preferred Platforms: ${aiQuery.context.preferences.platforms.join(', ')}
- Content Types: ${aiQuery.context.preferences.contentTypes.join(', ')}
- Languages: ${aiQuery.context.preferences.languages.join(', ')}`;
    }

    if (aiQuery.context?.previousSearches && aiQuery.context.previousSearches.length > 0) {
      message += `\n\nRecent Searches: ${aiQuery.context.previousSearches.slice(0, 3).join(', ')}`;
    }

    return message;
  }

  calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export default new AIService();
