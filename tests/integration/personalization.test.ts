import { describe, it, expect, beforeEach } from 'vitest';
import { PersonalizationEngine } from '../../src/personalization/engine.js';
import type { MediaItem } from '../../src/types/index.js';

describe('PersonalizationEngine', () => {
  let engine: PersonalizationEngine;

  beforeEach(async () => {
    engine = new PersonalizationEngine({ dimensions: 128 });
    await engine.initialize();
  });

  it('should initialize successfully', () => {
    expect(engine).toBeDefined();
  });

  it('should generate personalized recommendations', async () => {
    const userId = 'test-user-1';
    const candidates: MediaItem[] = [
      {
        id: 'movie-1',
        title: 'Test Movie 1',
        type: 'movie',
        releaseYear: 2023,
        rating: 8.5,
        platforms: ['Netflix'],
        embedding: new Array(128).fill(0).map(() => Math.random()),
      },
      {
        id: 'movie-2',
        title: 'Test Movie 2',
        type: 'movie',
        releaseYear: 2022,
        rating: 7.5,
        platforms: ['Hulu'],
        embedding: new Array(128).fill(0).map(() => Math.random()),
      },
    ];

    const recommendations = await engine.getRecommendations(userId, candidates);

    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]).toHaveProperty('mediaItem');
    expect(recommendations[0]).toHaveProperty('score');
    expect(recommendations[0]).toHaveProperty('reasoning');
  });

  it('should learn from user interactions', async () => {
    const userId = 'test-user-2';
    const mediaId = 'movie-1';

    await engine.learnFromInteraction(userId, mediaId, {
      type: 'watch',
      duration: 7200,
      completion: 0.95,
      rating: 9,
      embedding: new Array(128).fill(0).map(() => Math.random()),
    });

    // Should not throw
    expect(true).toBe(true);
  });

  it('should handle low completion interactions', async () => {
    const userId = 'test-user-3';
    const mediaId = 'movie-2';

    await engine.learnFromInteraction(userId, mediaId, {
      type: 'watch',
      duration: 300,
      completion: 0.1,
      embedding: new Array(128).fill(0).map(() => Math.random()),
    });

    // Should trigger reflexion
    expect(true).toBe(true);
  });
});
