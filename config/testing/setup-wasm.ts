/**
 * WASM Test Setup
 * Initializes WASM module for testing environment
 */

import { beforeAll } from 'vitest';

// Mock WebAssembly if not available
if (typeof WebAssembly === 'undefined') {
  (global as any).WebAssembly = {
    instantiate: async () => ({
      instance: {
        exports: {},
      },
    }),
    compile: async () => ({}),
  };
}

// Mock WASM module for testing
const mockWasmModule = {
  cosine_similarity: (a: Float32Array, b: Float32Array): number => {
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
  },

  normalize_vector: (vec: Float32Array): Float32Array => {
    let norm = 0;
    for (const val of vec) {
      norm += val * val;
    }
    norm = Math.sqrt(norm);

    if (norm === 0) return vec;

    const result = new Float32Array(vec.length);
    for (let i = 0; i < vec.length; i++) {
      result[i] = vec[i] / norm;
    }
    return result;
  },

  knn_search: (
    query: Float32Array,
    vectors: Float32Array,
    dim: number,
    k: number
  ): Array<{ index: number; similarity: number }> => {
    const numVectors = vectors.length / dim;
    const similarities: Array<{ index: number; similarity: number }> = [];

    for (let i = 0; i < numVectors; i++) {
      const vec = vectors.slice(i * dim, (i + 1) * dim);
      const sim = mockWasmModule.cosine_similarity(query, vec);
      similarities.push({ index: i, similarity: sim });
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, k);
  },

  batch_cosine_similarity: (
    query: Float32Array,
    vectors: Float32Array,
    dim: number
  ): Float32Array => {
    const numVectors = vectors.length / dim;
    const results = new Float32Array(numVectors);

    for (let i = 0; i < numVectors; i++) {
      const vec = vectors.slice(i * dim, (i + 1) * dim);
      results[i] = mockWasmModule.cosine_similarity(query, vec);
    }

    return results;
  },
};

beforeAll(() => {
  // Initialize WASM module mock
  (global as any).__WASM_MODULE__ = mockWasmModule;
  (global as any).__WASM_INIT_ERRORS__ = [];
});
