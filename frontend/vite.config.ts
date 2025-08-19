// frontend/vite.config.ts
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@t-op-arb-bot/types': path.resolve(__dirname, '../packages/types/src'),
    },
  },
  server: {
    proxy: {
      '/simulate': 'http://localhost:8080',
      '/quote': 'http://localhost:8080',
      '/pairs': 'http://localhost:8080',
      '/opportunities': 'http://localhost:8080',
      '/healthz': 'http://localhost:8080',
      '/readyz': 'http://localhost:8080',
      '/version': 'http://localhost:8080',
    },
  },
});
