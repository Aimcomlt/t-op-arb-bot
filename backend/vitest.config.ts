import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, './src'),
      '@blazing/core': path.resolve(__dirname, '../packages/core/src'),
      '@types': path.resolve(__dirname, '../packages/types/src'),
    },
  },
});
