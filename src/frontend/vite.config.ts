import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@components': path.resolve(__dirname, './components'),
      '@viz': path.resolve(__dirname, './viz'),
      '@hooks': path.resolve(__dirname, './hooks'),
      '@store': path.resolve(__dirname, './store'),
      '@utils': path.resolve(__dirname, './utils'),
      '@styles': path.resolve(__dirname, './styles'),
      '@types': path.resolve(__dirname, './types'),
      '@pages': path.resolve(__dirname, './pages'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: '../../dist/frontend',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'viz-vendor': ['d3', 'three', '@react-three/fiber', '@react-three/drei'],
          'graph-vendor': ['cytoscape', 'cytoscape-cola', 'react-cytoscapejs'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
});
