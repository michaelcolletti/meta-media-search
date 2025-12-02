import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/performance/**/*.{test,spec}.{js,ts}'],
    testTimeout: 60000,
    hookTimeout: 60000,
    reporters: ['verbose', 'json'],
    outputFile: './docs/testing/performance-results.json',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
      '@tests': resolve(__dirname, '../../tests'),
    },
  },
});
