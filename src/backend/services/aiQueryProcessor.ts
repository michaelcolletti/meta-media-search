import { ChatOpenAI } from '@langchain/openai';

export interface ProcessedQuery {
  intent: string;
  entities: {
    genres?: string[];
    mood?: string;
    similarTo?: string[];
    platforms?: string[];
    yearRange?: { min?: number; max?: number };
  };
  semanticEmbedding?: number[];
}

export class AIQueryProcessor {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
  }

  async processQuery(query: string, userPreferences: any = {}): Promise<ProcessedQuery> {
    try {
      // Use LLM to extract intent and entities from natural language
      const prompt = `
You are a media discovery assistant. Analyze the following search query and extract structured information.

Query: "${query}"

User preferences: ${JSON.stringify(userPreferences)}

Return a JSON object with:
- intent: The user's primary intent (e.g., "find_similar", "discover_new", "filter_by_criteria")
- entities: Extracted entities including:
  - genres: Array of genre names
  - mood: The mood or tone they're looking for
  - similarTo: Titles mentioned as references
  - platforms: Streaming platforms mentioned
  - yearRange: Time period if mentioned

Return ONLY valid JSON, no additional text.
`;

      const response = await this.llm.invoke(prompt);
      const content = typeof response.content === 'string' ? response.content : '';

      // Parse the LLM response
      const parsed = JSON.parse(content);

      return {
        intent: parsed.intent || 'general_search',
        entities: parsed.entities || {}
      };

    } catch (error) {
      console.error('Query processing error:', error);

      // Fallback: basic keyword extraction
      return {
        intent: 'general_search',
        entities: {
          genres: this.extractGenres(query),
          similarTo: this.extractTitles(query)
        }
      };
    }
  }

  private extractGenres(query: string): string[] {
    const genres = ['sci-fi', 'comedy', 'drama', 'action', 'thriller', 'horror', 'romance', 'documentary'];
    const queryLower = query.toLowerCase();
    return genres.filter(genre => queryLower.includes(genre));
  }

  private extractTitles(query: string): string[] {
    // Simple pattern matching for quoted titles or capitalized phrases
    const titlePattern = /"([^"]+)"|'([^']+)'/g;
    const matches = [];
    let match;

    while ((match = titlePattern.exec(query)) !== null) {
      matches.push(match[1] || match[2]);
    }

    return matches;
  }
}
