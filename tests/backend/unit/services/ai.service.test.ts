import { describe, it, expect, vi } from 'vitest';
import aiService from '../../../../src/backend/services/ai.service.js';

describe('AIService', () => {
  describe('calculateCosineSimilarity', () => {
    it('should calculate similarity between identical vectors', () => {
      const vector = [1, 2, 3, 4, 5];
      const similarity = aiService.calculateCosineSimilarity(vector, vector);
      expect(similarity).toBeCloseTo(1.0);
    });

    it('should calculate similarity between orthogonal vectors', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      const similarity = aiService.calculateCosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(0.0);
    });

    it('should calculate similarity between opposite vectors', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [-1, -2, -3];
      const similarity = aiService.calculateCosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(-1.0);
    });

    it('should throw error for vectors of different lengths', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [1, 2];

      expect(() => {
        aiService.calculateCosineSimilarity(vectorA, vectorB);
      }).toThrow('Vectors must have the same length');
    });
  });
});
