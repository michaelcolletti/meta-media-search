import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'wasm',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./config/testing/setup-wasm.ts'],
    include: ['tests/wasm/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['rust-wasm/pkg/**/*.js'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
      branches: 85,
      lines: 85,
      functions: 85,
      statements: 85,
    },
    testTimeout: 30000,
    hookTimeout: 10000,
  },
});
