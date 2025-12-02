import axios, { AxiosInstance } from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { MediaItem, Platform, Cast } from '@types/index.js';
import { ExternalAPIError } from '../utils/errors.js';
import cacheService from './cache.service.js';

class TMDBService {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p';

  constructor() {
    this.baseUrl = config.TMDB_BASE_URL;
    this.client = axios.create({
      baseURL: this.baseUrl,
      params: {
        api_key: config.TMDB_API_KEY,
      },
      timeout: 10000,
    });

    this.client.interceptors.response.use(
      response => response,
      error => {
        logger.error({ err: error }, 'TMDB API error');
        throw new ExternalAPIError('TMDB', error.message);
      }
    );
  }

  async searchMulti(query: string, page = 1): Promise<MediaItem[]> {
    const cacheKey = cacheService.generateKey('tmdb', 'search', query, page);
    const cached = await cacheService.get<MediaItem[]>(cacheKey);

    if (cached) {
      logger.debug({ query, page }, 'TMDB search cache hit');
      return cached;
    }

    try {
      const response = await this.client.get('/search/multi', {
        params: { query, page },
      });

      const items = response.data.results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map((item: any) => this.transformToMediaItem(item));

      await cacheService.set(cacheKey, items, 3600); // Cache for 1 hour
      return items;
    } catch (error) {
      logger.error({ err: error, query }, 'TMDB search error');
      throw new ExternalAPIError('TMDB', 'Search failed');
    }
  }

  async getMovieDetails(id: string): Promise<MediaItem> {
    const cacheKey = cacheService.generateKey('tmdb', 'movie', id);
    const cached = await cacheService.get<MediaItem>(cacheKey);

    if (cached) return cached;

    try {
      const [details, credits, watchProviders] = await Promise.all([
        this.client.get(`/movie/${id}`),
        this.client.get(`/movie/${id}/credits`),
        this.client.get(`/movie/${id}/watch/providers`),
      ]);

      const item = this.transformMovieDetails(details.data, credits.data, watchProviders.data);
      await cacheService.set(cacheKey, item, 86400); // Cache for 24 hours
      return item;
    } catch (error) {
      logger.error({ err: error, id }, 'TMDB movie details error');
      throw new ExternalAPIError('TMDB', 'Failed to fetch movie details');
    }
  }

  async getTVDetails(id: string): Promise<MediaItem> {
    const cacheKey = cacheService.generateKey('tmdb', 'tv', id);
    const cached = await cacheService.get<MediaItem>(cacheKey);

    if (cached) return cached;

    try {
      const [details, credits, watchProviders] = await Promise.all([
        this.client.get(`/tv/${id}`),
        this.client.get(`/tv/${id}/credits`),
        this.client.get(`/tv/${id}/watch/providers`),
      ]);

      const item = this.transformTVDetails(details.data, credits.data, watchProviders.data);
      await cacheService.set(cacheKey, item, 86400); // Cache for 24 hours
      return item;
    } catch (error) {
      logger.error({ err: error, id }, 'TMDB TV details error');
      throw new ExternalAPIError('TMDB', 'Failed to fetch TV details');
    }
  }

  async getTrending(mediaType: 'movie' | 'tv' | 'all', timeWindow: 'day' | 'week' = 'week'): Promise<MediaItem[]> {
    const cacheKey = cacheService.generateKey('tmdb', 'trending', mediaType, timeWindow);
    const cached = await cacheService.get<MediaItem[]>(cacheKey);

    if (cached) return cached;

    try {
      const response = await this.client.get(`/trending/${mediaType}/${timeWindow}`);
      const items = response.data.results.map((item: any) => this.transformToMediaItem(item));

      await cacheService.set(cacheKey, items, 3600); // Cache for 1 hour
      return items;
    } catch (error) {
      logger.error({ err: error, mediaType }, 'TMDB trending error');
      throw new ExternalAPIError('TMDB', 'Failed to fetch trending content');
    }
  }

  async getGenres(): Promise<Record<string, { id: number; name: string }[]>> {
    const cacheKey = cacheService.generateKey('tmdb', 'genres');
    const cached = await cacheService.get<Record<string, any>>(cacheKey);

    if (cached) return cached;

    try {
      const [movieGenres, tvGenres] = await Promise.all([
        this.client.get('/genre/movie/list'),
        this.client.get('/genre/tv/list'),
      ]);

      const genres = {
        movie: movieGenres.data.genres,
        tv: tvGenres.data.genres,
      };

      await cacheService.set(cacheKey, genres, 86400 * 7); // Cache for 7 days
      return genres;
    } catch (error) {
      logger.error({ err: error }, 'TMDB genres error');
      throw new ExternalAPIError('TMDB', 'Failed to fetch genres');
    }
  }

  private transformToMediaItem(item: any): MediaItem {
    const isMovie = item.media_type === 'movie';

    return {
      id: `tmdb_${item.media_type}_${item.id}`,
      title: isMovie ? item.title : item.name,
      type: isMovie ? 'movie' : 'tv',
      description: item.overview || '',
      genres: [],
      releaseDate: isMovie ? item.release_date : item.first_air_date,
      rating: item.vote_average || 0,
      thumbnail: item.poster_path ? `${this.imageBaseUrl}/w500${item.poster_path}` : '',
      posterUrl: item.poster_path ? `${this.imageBaseUrl}/original${item.poster_path}` : '',
      backdropUrl: item.backdrop_path ? `${this.imageBaseUrl}/original${item.backdrop_path}` : undefined,
      platforms: [],
      metadata: {
        tmdbId: item.id,
        popularity: item.popularity,
        voteCount: item.vote_count,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private transformMovieDetails(movie: any, credits: any, providers: any): MediaItem {
    return {
      id: `tmdb_movie_${movie.id}`,
      title: movie.title,
      type: 'movie',
      description: movie.overview || '',
      genres: movie.genres?.map((g: any) => g.name) || [],
      releaseDate: movie.release_date,
      rating: movie.vote_average || 0,
      thumbnail: movie.poster_path ? `${this.imageBaseUrl}/w500${movie.poster_path}` : '',
      posterUrl: movie.poster_path ? `${this.imageBaseUrl}/original${movie.poster_path}` : '',
      backdropUrl: movie.backdrop_path ? `${this.imageBaseUrl}/original${movie.backdrop_path}` : undefined,
      trailerUrl: undefined, // Would need additional API call to get videos
      platforms: this.extractPlatforms(providers),
      cast: credits.cast?.slice(0, 10).map((c: any) => ({
        id: c.id.toString(),
        name: c.name,
        character: c.character,
        profileUrl: c.profile_path ? `${this.imageBaseUrl}/w185${c.profile_path}` : undefined,
      })),
      director: credits.crew?.find((c: any) => c.job === 'Director')?.name,
      duration: movie.runtime,
      metadata: {
        tmdbId: movie.id,
        imdbId: movie.imdb_id,
        popularity: movie.popularity,
        budget: movie.budget,
        revenue: movie.revenue,
        tagline: movie.tagline,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private transformTVDetails(tv: any, credits: any, providers: any): MediaItem {
    return {
      id: `tmdb_tv_${tv.id}`,
      title: tv.name,
      type: 'tv',
      description: tv.overview || '',
      genres: tv.genres?.map((g: any) => g.name) || [],
      releaseDate: tv.first_air_date,
      rating: tv.vote_average || 0,
      thumbnail: tv.poster_path ? `${this.imageBaseUrl}/w500${tv.poster_path}` : '',
      posterUrl: tv.poster_path ? `${this.imageBaseUrl}/original${tv.poster_path}` : '',
      backdropUrl: tv.backdrop_path ? `${this.imageBaseUrl}/original${tv.backdrop_path}` : undefined,
      platforms: this.extractPlatforms(providers),
      cast: credits.cast?.slice(0, 10).map((c: any) => ({
        id: c.id.toString(),
        name: c.name,
        character: c.character,
        profileUrl: c.profile_path ? `${this.imageBaseUrl}/w185${c.profile_path}` : undefined,
      })),
      seasons: tv.number_of_seasons,
      episodes: tv.number_of_episodes,
      metadata: {
        tmdbId: tv.id,
        popularity: tv.popularity,
        status: tv.status,
        type: tv.type,
        networks: tv.networks?.map((n: any) => n.name),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private extractPlatforms(providers: any): Platform[] {
    const platforms: Platform[] = [];
    const usProviders = providers.results?.US;

    if (!usProviders) return platforms;

    // Streaming platforms
    usProviders.flatrate?.forEach((provider: any) => {
      platforms.push({
        id: provider.provider_id.toString(),
        name: provider.provider_name,
        type: 'streaming',
        url: '',
        available: true,
        logo: provider.logo_path ? `${this.imageBaseUrl}/original${provider.logo_path}` : '',
      });
    });

    // Rental platforms
    usProviders.rent?.forEach((provider: any) => {
      platforms.push({
        id: provider.provider_id.toString(),
        name: provider.provider_name,
        type: 'rental',
        url: '',
        available: true,
        logo: provider.logo_path ? `${this.imageBaseUrl}/original${provider.logo_path}` : '',
      });
    });

    return platforms;
  }
}

export default new TMDBService();
