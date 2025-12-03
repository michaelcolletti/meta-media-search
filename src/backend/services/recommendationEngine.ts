import { ContentAggregator, MediaContent } from './contentAggregator.js';

export class RecommendationEngine {
  private contentAggregator: ContentAggregator;

  constructor() {
    this.contentAggregator = new ContentAggregator();
  }

  async getRecommendations(params: { userId: string; limit: number }): Promise<MediaContent[]> {
    // TODO: Implement personalized recommendation algorithm
    // For now, return popular content

    const results = await this.contentAggregator.search({
      limit: params.limit
    });

    return results.slice(0, params.limit);
  }

  async generateMapView(recommendations: MediaContent[]) {
    return await this.contentAggregator.generateMapData(recommendations);
  }
}
