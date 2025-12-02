import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./config/testing/integration-setup.js'],
    include: ['tests/integration/**/*.{test,spec}.{js,ts}'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
      '@tests': resolve(__dirname, '../../tests')
    }
  }
});
