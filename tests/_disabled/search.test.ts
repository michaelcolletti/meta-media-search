import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/backend/index';

describe('Search API', () => {
  describe('POST /api/search', () => {
    it('should return search results for a valid query', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({
          query: 'funny sci-fi movies like The Martian'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('query');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('visualMap');
      expect(response.body.results.items).toBeInstanceOf(Array);
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid query type', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({
          query: 123
        });

      expect(response.status).toBe(400);
    });

    it('should accept optional filters', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({
          query: 'action movies',
          filters: {
            platforms: ['Netflix'],
            yearRange: { min: 2020, max: 2024 }
          }
        });

      expect(response.status).toBe(200);
    });

    it('should include visual map data in response', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({
          query: 'comedy shows'
        });

      expect(response.status).toBe(200);
      expect(response.body.visualMap).toHaveProperty('nodes');
      expect(response.body.visualMap).toHaveProperty('edges');
      expect(Array.isArray(response.body.visualMap.nodes)).toBe(true);
      expect(Array.isArray(response.body.visualMap.edges)).toBe(true);
    });
  });
});
