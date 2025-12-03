import axios from 'axios';

export interface MediaContent {
  id: string;
  title: string;
  type: 'movie' | 'tv' | 'documentary';
  genres: string[];
  platforms: string[];
  rating: number;
  year: number;
  description: string;
  imageUrl?: string;
  similarity?: number;
}

export interface MapNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  size: number;
  metadata: any;
}

export interface MapEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
}

export class ContentAggregator {
  private tmdbApiKey: string;
  private tmdbBaseUrl = 'https://api.themoviedb.org/3';

  constructor() {
    this.tmdbApiKey = process.env.TMDB_API_KEY || '';
  }

  async search(params: any): Promise<MediaContent[]> {
    try {
      // For now, use TMDB as primary source
      // TODO: Integrate multiple sources (Netflix, Hulu, etc.)

      if (!this.tmdbApiKey) {
        console.warn('TMDB API key not configured, returning mock data');
        return this.getMockData(params);
      }

      const results = await this.searchTMDB(params);
      return results;

    } catch (error) {
      console.error('Content aggregation error:', error);
      return this.getMockData(params);
    }
  }

  private async searchTMDB(params: any): Promise<MediaContent[]> {
    const { genres = [], similarTo = [] } = params;

    // If we have a reference title, search for it first then get similar
    if (similarTo.length > 0) {
      return await this.findSimilar(similarTo[0]);
    }

    // Otherwise do a general search
    const response = await axios.get(`${this.tmdbBaseUrl}/discover/movie`, {
      params: {
        api_key: this.tmdbApiKey,
        with_genres: genres.join(','),
        sort_by: 'popularity.desc'
      }
    });

    return response.data.results.map((item: any) => this.mapTMDBResult(item));
  }

  private async findSimilar(title: string): Promise<MediaContent[]> {
    // Search for the title
    const searchResponse = await axios.get(`${this.tmdbBaseUrl}/search/movie`, {
      params: {
        api_key: this.tmdbApiKey,
        query: title
      }
    });

    if (searchResponse.data.results.length === 0) {
      return [];
    }

    const movieId = searchResponse.data.results[0].id;

    // Get similar movies
    const similarResponse = await axios.get(`${this.tmdbBaseUrl}/movie/${movieId}/similar`, {
      params: {
        api_key: this.tmdbApiKey
      }
    });

    return similarResponse.data.results.map((item: any) => this.mapTMDBResult(item));
  }

  private mapTMDBResult(item: any): MediaContent {
    return {
      id: `tmdb-${item.id}`,
      title: item.title || item.name,
      type: item.media_type || 'movie',
      genres: [], // Would need separate API call for full genre names
      platforms: ['TMDB'], // Would integrate with JustWatch or similar for actual platforms
      rating: item.vote_average,
      year: new Date(item.release_date || item.first_air_date).getFullYear(),
      description: item.overview,
      imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined
    };
  }

  async generateMapData(content: MediaContent[]): Promise<{ nodes: MapNode[]; edges: MapEdge[] }> {
    const nodes: MapNode[] = [];
    const edges: MapEdge[] = [];

    // Create nodes for each content item
    content.forEach((item, index) => {
      // Use a force-directed layout simulation for positioning
      const angle = (index / content.length) * 2 * Math.PI;
      const radius = 300 + Math.random() * 200;

      nodes.push({
        id: item.id,
        label: item.title,
        type: item.type,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: item.rating * 10,
        metadata: item
      });
    });

    // Create edges based on similarity
    for (let i = 0; i < content.length; i++) {
      for (let j = i + 1; j < content.length; j++) {
        const similarity = this.calculateSimilarity(content[i], content[j]);

        if (similarity > 0.5) {
          edges.push({
            source: content[i].id,
            target: content[j].id,
            weight: similarity,
            type: 'similar'
          });
        }
      }
    }

    return { nodes, edges };
  }

  private calculateSimilarity(a: MediaContent, b: MediaContent): number {
    let similarity = 0;

    // Genre overlap
    const commonGenres = a.genres.filter(g => b.genres.includes(g));
    similarity += commonGenres.length * 0.3;

    // Year proximity
    const yearDiff = Math.abs(a.year - b.year);
    similarity += Math.max(0, (10 - yearDiff) / 10) * 0.2;

    // Rating proximity
    const ratingDiff = Math.abs(a.rating - b.rating);
    similarity += Math.max(0, (5 - ratingDiff) / 5) * 0.2;

    // Type match
    if (a.type === b.type) similarity += 0.3;

    return Math.min(1, similarity);
  }

  private getMockData(params: any): MediaContent[] {
    return [
      {
        id: 'mock-1',
        title: 'The Martian',
        type: 'movie',
        genres: ['sci-fi', 'drama'],
        platforms: ['Netflix', 'Hulu'],
        rating: 8.0,
        year: 2015,
        description: 'An astronaut becomes stranded on Mars and must find a way to survive.'
      },
      {
        id: 'mock-2',
        title: 'Interstellar',
        type: 'movie',
        genres: ['sci-fi', 'drama'],
        platforms: ['Amazon Prime'],
        rating: 8.6,
        year: 2014,
        description: 'A team of explorers travel through a wormhole in space.'
      }
    ];
  }
}
