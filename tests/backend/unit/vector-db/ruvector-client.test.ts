/**
 * RuVector Client Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import RuVectorClient from '../../../../src/vector-db/ruvector-client.js';

describe('RuVectorClient', () => {
  let client: RuVectorClient;
  const testCollection = 'test_collection';

  beforeEach(async () => {
    client = new RuVectorClient({
      defaultCollection: testCollection,
      dimensions: 128,
    });
    await client.connect();
  });

  afterEach(async () => {
    await client.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect successfully', () => {
      expect(client.isConnected()).toBe(true);
    });

    it('should create default collection on connect', async () => {
      const collections = await client.listCollections();
      expect(collections).toContain(testCollection);
    });

    it('should disconnect successfully', async () => {
      await client.disconnect();
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('Collection Operations', () => {
    it('should create a new collection', async () => {
      const collectionName = 'new_test_collection';

      await client.createCollection(collectionName, {
        dimensions: 128,
        indexType: 'hnsw',
      });

      const collections = await client.listCollections();
      expect(collections).toContain(collectionName);
    });

    it('should get collection stats', async () => {
      const stats = await client.getCollectionStats(testCollection);

      expect(stats).toHaveProperty('vectorCount');
      expect(stats).toHaveProperty('dimensions');
      expect(stats).toHaveProperty('indexType');
      expect(stats.dimensions).toBe(128);
    });
  });

  describe('Vector Operations', () => {
    const testVectors = [
      {
        id: 'vec1',
        vector: Array(128).fill(0.5),
        metadata: { type: 'movie', genre: 'action' },
      },
      {
        id: 'vec2',
        vector: Array(128).fill(0.3),
        metadata: { type: 'tv', genre: 'drama' },
      },
      {
        id: 'vec3',
        vector: Array(128).fill(0.7),
        metadata: { type: 'movie', genre: 'comedy' },
      },
    ];

    it('should upsert vectors', async () => {
      const result = await client.upsert(testCollection, testVectors);

      expect(result.success).toBe(true);
      expect(result.inserted).toBe(3);
    });

    it('should retrieve vector by ID', async () => {
      await client.upsert(testCollection, testVectors);

      const vector = await client.get(testCollection, 'vec1');

      expect(vector).toBeDefined();
      expect(vector?.id).toBe('vec1');
      expect(vector?.metadata.type).toBe('movie');
    });

    it('should search for similar vectors', async () => {
      await client.upsert(testCollection, testVectors);

      const queryVector = Array(128).fill(0.5);
      const results = await client.search(testCollection, queryVector, {
        limit: 2,
      });

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('vec1'); // Should match closest vector
      expect(results[0].score).toBeGreaterThan(0.9);
    });

    it('should filter search results by metadata', async () => {
      await client.upsert(testCollection, testVectors);

      const queryVector = Array(128).fill(0.5);
      const results = await client.search(testCollection, queryVector, {
        limit: 10,
        filter: { type: 'movie' },
      });

      expect(results.length).toBeLessThanOrEqual(2);
      results.forEach(result => {
        expect(result.metadata.type).toBe('movie');
      });
    });

    it('should apply score threshold', async () => {
      await client.upsert(testCollection, testVectors);

      const queryVector = Array(128).fill(0.1);
      const results = await client.search(testCollection, queryVector, {
        limit: 10,
        scoreThreshold: 0.9,
      });

      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should delete vector by ID', async () => {
      await client.upsert(testCollection, testVectors);

      const deleted = await client.delete(testCollection, 'vec1');
      expect(deleted).toBe(true);

      const vector = await client.get(testCollection, 'vec1');
      expect(vector).toBeNull();
    });

    it('should perform batch search', async () => {
      await client.upsert(testCollection, testVectors);

      const queryVectors = [
        Array(128).fill(0.5),
        Array(128).fill(0.3),
      ];

      const results = await client.batchSearch(testCollection, queryVectors, {
        limit: 2,
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(2);
      expect(results[1]).toHaveLength(2);
    });
  });

  describe('Vector Validation', () => {
    it('should reject vector with wrong dimensions', async () => {
      const invalidVector = {
        id: 'invalid',
        vector: Array(64).fill(0.5), // Wrong dimensions
        metadata: {},
      };

      await expect(client.upsert(testCollection, [invalidVector])).rejects.toThrow(
        'Vector dimension mismatch'
      );
    });

    it('should reject non-array vector', async () => {
      const invalidVector = {
        id: 'invalid',
        vector: 'not an array' as any,
        metadata: {},
      };

      await expect(client.upsert(testCollection, [invalidVector])).rejects.toThrow(
        'Vector must be an array'
      );
    });

    it('should require connection before operations', async () => {
      const newClient = new RuVectorClient();

      await expect(
        newClient.search('test', Array(128).fill(0.5))
      ).rejects.toThrow('not connected');
    });
  });

  describe('Similarity Calculations', () => {
    it('should calculate cosine similarity correctly', async () => {
      const vec1 = Array(128).fill(1.0);
      const vec2 = Array(128).fill(1.0);

      await client.upsert(testCollection, [
        { id: 'identical', vector: vec2, metadata: {} },
      ]);

      const results = await client.search(testCollection, vec1, { limit: 1 });

      expect(results[0].score).toBeCloseTo(1.0, 2); // Identical vectors
    });

    it('should handle orthogonal vectors', async () => {
      const vec1 = [...Array(64).fill(1.0), ...Array(64).fill(0.0)];
      const vec2 = [...Array(64).fill(0.0), ...Array(64).fill(1.0)];

      await client.upsert(testCollection, [
        { id: 'orthogonal', vector: vec2, metadata: {} },
      ]);

      const results = await client.search(testCollection, vec1, { limit: 1 });

      expect(results[0].score).toBeCloseTo(0.0, 2); // Orthogonal vectors
    });
  });
});
