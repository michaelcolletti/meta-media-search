/**
 * WASM vs JavaScript Performance Benchmarks
 *
 * Compares performance of WASM and pure JavaScript implementations
 * for vector operations and search algorithms
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  operation: string;
  wasmTime: number;
  jsTime: number;
  speedup: number;
  iterations: number;
}

// Pure JavaScript implementations for comparison
class JSVectorOps {
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have equal length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  static normalizeVector(vec: number[]): number[] {
    let norm = 0;
    for (const val of vec) {
      norm += val * val;
    }
    norm = Math.sqrt(norm);

    if (norm === 0) return vec;

    return vec.map(v => v / norm);
  }

  static knnSearch(
    query: number[],
    vectors: number[][],
    k: number
  ): Array<{ index: number; similarity: number }> {
    const similarities = vectors.map((vec, index) => ({
      index,
      similarity: this.cosineSimilarity(query, vec),
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, k);
  }

  static batchCosineSimilarity(
    query: number[],
    vectors: number[][]
  ): number[] {
    return vectors.map(vec => this.cosineSimilarity(query, vec));
  }
}

describe('WASM Performance Benchmarks', () => {
  const results: BenchmarkResult[] = [];

  // Mock WASM module for testing
  const wasmModule = {
    cosine_similarity: (a: Float32Array, b: Float32Array) => {
      return JSVectorOps.cosineSimilarity(Array.from(a), Array.from(b));
    },
    normalize_vector: (vec: Float32Array) => {
      return new Float32Array(JSVectorOps.normalizeVector(Array.from(vec)));
    },
    knn_search: (
      query: Float32Array,
      vectors: Float32Array,
      dim: number,
      k: number
    ) => {
      const vecs: number[][] = [];
      for (let i = 0; i < vectors.length / dim; i++) {
        vecs.push(Array.from(vectors.slice(i * dim, (i + 1) * dim)));
      }
      return JSVectorOps.knnSearch(Array.from(query), vecs, k);
    },
  };

  function runBenchmark(
    name: string,
    wasmFn: () => void,
    jsFn: () => void,
    iterations: number = 1000
  ): BenchmarkResult {
    // Warm-up
    for (let i = 0; i < 10; i++) {
      wasmFn();
      jsFn();
    }

    // Benchmark WASM
    const wasmStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      wasmFn();
    }
    const wasmTime = performance.now() - wasmStart;

    // Benchmark JS
    const jsStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      jsFn();
    }
    const jsTime = performance.now() - jsStart;

    const result = {
      operation: name,
      wasmTime: wasmTime / iterations,
      jsTime: jsTime / iterations,
      speedup: jsTime / wasmTime,
      iterations,
    };

    results.push(result);
    return result;
  }

  describe('Cosine Similarity', () => {
    it('should benchmark small vectors (dim=3)', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      const aJS = Array.from(a);
      const bJS = Array.from(b);

      const result = runBenchmark(
        'Cosine Similarity (dim=3)',
        () => wasmModule.cosine_similarity(a, b),
        () => JSVectorOps.cosineSimilarity(aJS, bJS),
        10000
      );

      expect(result.wasmTime).toBeGreaterThan(0);
      expect(result.jsTime).toBeGreaterThan(0);
      console.log(`Speedup: ${result.speedup.toFixed(2)}x`);
    });

    it('should benchmark medium vectors (dim=128)', () => {
      const a = new Float32Array(128).fill(Math.random());
      const b = new Float32Array(128).fill(Math.random());
      const aJS = Array.from(a);
      const bJS = Array.from(b);

      const result = runBenchmark(
        'Cosine Similarity (dim=128)',
        () => wasmModule.cosine_similarity(a, b),
        () => JSVectorOps.cosineSimilarity(aJS, bJS),
        5000
      );

      // WASM should be faster for larger vectors
      expect(result.speedup).toBeGreaterThan(1);
    });

    it('should benchmark large vectors (dim=1536)', () => {
      const a = new Float32Array(1536).fill(Math.random());
      const b = new Float32Array(1536).fill(Math.random());
      const aJS = Array.from(a);
      const bJS = Array.from(b);

      const result = runBenchmark(
        'Cosine Similarity (dim=1536)',
        () => wasmModule.cosine_similarity(a, b),
        () => JSVectorOps.cosineSimilarity(aJS, bJS),
        1000
      );

      // Significant speedup expected for large vectors
      expect(result.speedup).toBeGreaterThan(2);
    });
  });

  describe('Vector Normalization', () => {
    it('should benchmark normalization (dim=128)', () => {
      const vec = new Float32Array(128).fill(Math.random());
      const vecJS = Array.from(vec);

      const result = runBenchmark(
        'Vector Normalization (dim=128)',
        () => wasmModule.normalize_vector(vec),
        () => JSVectorOps.normalizeVector(vecJS),
        5000
      );

      expect(result.speedup).toBeGreaterThan(0);
    });

    it('should benchmark normalization (dim=1536)', () => {
      const vec = new Float32Array(1536).fill(Math.random());
      const vecJS = Array.from(vec);

      const result = runBenchmark(
        'Vector Normalization (dim=1536)',
        () => wasmModule.normalize_vector(vec),
        () => JSVectorOps.normalizeVector(vecJS),
        1000
      );

      expect(result.speedup).toBeGreaterThan(1);
    });
  });

  describe('KNN Search', () => {
    it('should benchmark KNN (1000 vectors, dim=128, k=10)', () => {
      const query = new Float32Array(128).fill(Math.random());
      const vectors = new Float32Array(128 * 1000);
      const queryJS = Array.from(query);
      const vectorsJS: number[][] = [];

      for (let i = 0; i < vectors.length; i++) {
        vectors[i] = Math.random();
        if (i % 128 === 0) {
          vectorsJS.push([]);
        }
        vectorsJS[Math.floor(i / 128)].push(vectors[i]);
      }

      const result = runBenchmark(
        'KNN Search (1000 vectors)',
        () => wasmModule.knn_search(query, vectors, 128, 10),
        () => JSVectorOps.knnSearch(queryJS, vectorsJS, 10),
        100
      );

      // WASM should show significant speedup for batch operations
      expect(result.speedup).toBeGreaterThan(2);
    });

    it('should benchmark KNN (10000 vectors, dim=128, k=10)', () => {
      const query = new Float32Array(128).fill(Math.random());
      const vectors = new Float32Array(128 * 10000);
      const queryJS = Array.from(query);
      const vectorsJS: number[][] = [];

      for (let i = 0; i < vectors.length; i++) {
        vectors[i] = Math.random();
        if (i % 128 === 0) {
          vectorsJS.push([]);
        }
        vectorsJS[Math.floor(i / 128)].push(vectors[i]);
      }

      const result = runBenchmark(
        'KNN Search (10000 vectors)',
        () => wasmModule.knn_search(query, vectors, 128, 10),
        () => JSVectorOps.knnSearch(queryJS, vectorsJS, 10),
        10
      );

      // Larger datasets should show even better speedup
      expect(result.speedup).toBeGreaterThan(3);
    });
  });

  describe('Batch Operations', () => {
    it('should benchmark batch similarity (100 vectors)', () => {
      const query = new Float32Array(128).fill(Math.random());
      const vectors = new Float32Array(128 * 100);
      const queryJS = Array.from(query);
      const vectorsJS: number[][] = [];

      for (let i = 0; i < vectors.length; i++) {
        vectors[i] = Math.random();
        if (i % 128 === 0) {
          vectorsJS.push([]);
        }
        vectorsJS[Math.floor(i / 128)].push(vectors[i]);
      }

      const result = runBenchmark(
        'Batch Similarity (100 vectors)',
        () => wasmModule.knn_search(query, vectors, 128, 100),
        () => JSVectorOps.batchCosineSimilarity(queryJS, vectorsJS),
        500
      );

      expect(result.speedup).toBeGreaterThan(1);
    });
  });

  describe('Memory Efficiency', () => {
    it('should measure memory usage for large operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform large batch operation
      const query = new Float32Array(1536).fill(Math.random());
      const vectors = new Float32Array(1536 * 1000);

      for (let i = 0; i < 100; i++) {
        wasmModule.knn_search(query, vectors, 1536, 10);
      }

      global.gc && global.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024;

      // Memory growth should be minimal
      expect(memoryGrowth).toBeLessThan(100);
    });
  });

  afterAll(() => {
    console.log('\n=== WASM Performance Benchmark Results ===\n');
    console.table(
      results.map(r => ({
        Operation: r.operation,
        'WASM (ms)': r.wasmTime.toFixed(4),
        'JS (ms)': r.jsTime.toFixed(4),
        'Speedup': `${r.speedup.toFixed(2)}x`,
        Iterations: r.iterations,
      }))
    );
  });
});
