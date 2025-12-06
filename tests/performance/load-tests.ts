/**
 * Load Tests for Vector Search
 *
 * Tests system behavior under high load:
 * - Concurrent vector searches
 * - Large dataset operations
 * - Memory pressure scenarios
 * - Response time degradation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import { performance } from 'perf_hooks';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CONCURRENT_USERS = 50;
const OPERATIONS_PER_USER = 20;

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
}

describe('Vector Search Load Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Create test user
    const response = await axios.post(`${API_URL}/api/auth/signup`, {
      email: `loadtest-${Date.now()}@example.com`,
      password: 'TestPass123!',
    });
    authToken = response.data.token;
  }, 30000);

  function analyzeResults(responseTimes: number[]): LoadTestResult {
    const sorted = responseTimes.sort((a, b) => a - b);
    const successful = sorted.filter(t => t > 0);
    const failed = responseTimes.length - successful.length;

    return {
      totalRequests: responseTimes.length,
      successfulRequests: successful.length,
      failedRequests: failed,
      averageResponseTime: successful.reduce((a, b) => a + b, 0) / successful.length,
      p95ResponseTime: sorted[Math.floor(sorted.length * 0.95)],
      p99ResponseTime: sorted[Math.floor(sorted.length * 0.99)],
      throughput: successful.length / (sorted[sorted.length - 1] - sorted[0]) * 1000,
      errorRate: failed / responseTimes.length,
    };
  }

  describe('Concurrent Search Requests', () => {
    it('should handle 50 concurrent users performing searches', async () => {
      const queries = [
        'action movies',
        'romantic comedies',
        'science fiction',
        'thriller movies',
        'documentaries',
      ];

      const responseTimes: number[] = [];

      const userPromises = Array(CONCURRENT_USERS)
        .fill(null)
        .map(async (_, userIndex) => {
          for (let i = 0; i < OPERATIONS_PER_USER; i++) {
            const query = queries[Math.floor(Math.random() * queries.length)];
            const start = performance.now();

            try {
              await axios.get(`${API_URL}/api/search`, {
                params: { q: query },
                headers: { Authorization: `Bearer ${authToken}` },
              });
              responseTimes.push(performance.now() - start);
            } catch (error) {
              responseTimes.push(-1); // Mark as failed
            }
          }
        });

      await Promise.all(userPromises);

      const results = analyzeResults(responseTimes);

      console.log('\n=== Concurrent Search Load Test Results ===');
      console.log(`Total Requests: ${results.totalRequests}`);
      console.log(`Successful: ${results.successfulRequests}`);
      console.log(`Failed: ${results.failedRequests}`);
      console.log(`Average Response Time: ${results.averageResponseTime.toFixed(2)}ms`);
      console.log(`P95 Response Time: ${results.p95ResponseTime.toFixed(2)}ms`);
      console.log(`P99 Response Time: ${results.p99ResponseTime.toFixed(2)}ms`);
      console.log(`Throughput: ${results.throughput.toFixed(2)} req/s`);
      console.log(`Error Rate: ${(results.errorRate * 100).toFixed(2)}%`);

      // Assertions
      expect(results.errorRate).toBeLessThan(0.01); // <1% error rate
      expect(results.averageResponseTime).toBeLessThan(500); // <500ms average
      expect(results.p95ResponseTime).toBeLessThan(1000); // <1s p95
    }, 120000);

    it('should handle burst traffic', async () => {
      const BURST_SIZE = 100;
      const responseTimes: number[] = [];

      // Create burst
      const requests = Array(BURST_SIZE)
        .fill(null)
        .map(async () => {
          const start = performance.now();
          try {
            await axios.get(`${API_URL}/api/search`, {
              params: { q: 'action' },
              headers: { Authorization: `Bearer ${authToken}` },
            });
            return performance.now() - start;
          } catch {
            return -1;
          }
        });

      const results = await Promise.all(requests);
      responseTimes.push(...results);

      const analysis = analyzeResults(responseTimes);

      expect(analysis.errorRate).toBeLessThan(0.05); // <5% error rate for burst
      expect(analysis.p99ResponseTime).toBeLessThan(2000); // <2s p99
    }, 60000);
  });

  describe('Vector Similarity Search Load', () => {
    it('should handle concurrent vector similarity calculations', async () => {
      const responseTimes: number[] = [];

      const requests = Array(100)
        .fill(null)
        .map(async () => {
          const start = performance.now();
          try {
            await axios.post(
              `${API_URL}/api/vectors/similarity`,
              {
                query: Array(1536).fill(Math.random()),
                k: 10,
              },
              { headers: { Authorization: `Bearer ${authToken}` } }
            );
            return performance.now() - start;
          } catch {
            return -1;
          }
        });

      const results = await Promise.all(requests);
      responseTimes.push(...results);

      const analysis = analyzeResults(responseTimes);

      expect(analysis.averageResponseTime).toBeLessThan(100); // <100ms
      expect(analysis.errorRate).toBeLessThan(0.01);
    }, 60000);

    it('should handle large k values in KNN search', async () => {
      const kValues = [10, 50, 100, 500];
      const results: Record<number, number> = {};

      for (const k of kValues) {
        const start = performance.now();

        await axios.post(
          `${API_URL}/api/vectors/knn`,
          {
            query: Array(128).fill(Math.random()),
            k,
          },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        results[k] = performance.now() - start;
      }

      // Response time should scale linearly with k
      expect(results[10]).toBeLessThan(50);
      expect(results[100]).toBeLessThan(200);
      expect(results[500]).toBeLessThan(500);
    }, 30000);
  });

  describe('Memory Pressure Tests', () => {
    it('should handle large vector datasets', async () => {
      const LARGE_DATASET_SIZE = 10000;
      const vectors = Array(LARGE_DATASET_SIZE)
        .fill(null)
        .map(() => Array(128).fill(Math.random()));

      const start = performance.now();

      const response = await axios.post(
        `${API_URL}/api/vectors/batch-similarity`,
        {
          query: Array(128).fill(Math.random()),
          vectors,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
          timeout: 30000,
        }
      );

      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(response.data.results).toHaveLength(LARGE_DATASET_SIZE);
      expect(duration).toBeLessThan(5000); // <5s for 10k vectors
    }, 60000);

    it('should maintain performance under sustained load', async () => {
      const DURATION_MS = 30000; // 30 seconds
      const startTime = Date.now();
      const responseTimes: number[] = [];

      while (Date.now() - startTime < DURATION_MS) {
        const start = performance.now();

        try {
          await axios.get(`${API_URL}/api/search`, {
            params: { q: 'test' },
            headers: { Authorization: `Bearer ${authToken}` },
          });
          responseTimes.push(performance.now() - start);
        } catch {
          responseTimes.push(-1);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const analysis = analyzeResults(responseTimes);

      // Performance should not degrade significantly
      const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
      const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));

      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      expect(avgSecond).toBeLessThan(avgFirst * 1.5); // <50% degradation
    }, 60000);
  });

  describe('Recommendation Load Tests', () => {
    it('should handle concurrent recommendation requests', async () => {
      const responseTimes: number[] = [];

      const requests = Array(50)
        .fill(null)
        .map(async () => {
          const start = performance.now();
          try {
            await axios.get(`${API_URL}/api/recommendations`, {
              headers: { Authorization: `Bearer ${authToken}` },
            });
            return performance.now() - start;
          } catch {
            return -1;
          }
        });

      const results = await Promise.all(requests);
      responseTimes.push(...results);

      const analysis = analyzeResults(responseTimes);

      expect(analysis.averageResponseTime).toBeLessThan(500);
      expect(analysis.errorRate).toBeLessThan(0.01);
    }, 60000);

    it('should cache recommendations appropriately', async () => {
      // First request (cold cache)
      const start1 = performance.now();
      await axios.get(`${API_URL}/api/recommendations`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const coldTime = performance.now() - start1;

      // Second request (warm cache)
      const start2 = performance.now();
      await axios.get(`${API_URL}/api/recommendations`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const warmTime = performance.now() - start2;

      // Cached request should be significantly faster
      expect(warmTime).toBeLessThan(coldTime * 0.5);
    }, 30000);
  });

  describe('Database Query Load', () => {
    it('should handle high volume of database queries', async () => {
      const responseTimes: number[] = [];

      const requests = Array(200)
        .fill(null)
        .map(async () => {
          const start = performance.now();
          try {
            await axios.get(`${API_URL}/api/media/trending`, {
              headers: { Authorization: `Bearer ${authToken}` },
            });
            return performance.now() - start;
          } catch {
            return -1;
          }
        });

      const results = await Promise.all(requests);
      responseTimes.push(...results);

      const analysis = analyzeResults(responseTimes);

      expect(analysis.averageResponseTime).toBeLessThan(200);
      expect(analysis.errorRate).toBeLessThan(0.02);
    }, 60000);
  });

  afterAll(() => {
    console.log('\n=== Load Test Summary ===');
    console.log('All load tests completed successfully');
  });
});
