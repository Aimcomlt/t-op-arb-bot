import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, './src'),
      '@blazing/core': path.resolve(__dirname, '../packages/core/src'),
      '@': path.resolve(__dirname, '../packages/core/src'),
      '@types': path.resolve(__dirname, '../packages/types/src'),
      '@t-op-arb-bot/types': path.resolve(__dirname, '../packages/types/src'),
    },
  },
    server: {
    proxy: {
      '/stream': {
        target: 'ws://localhost:8081',
        ws: true,
        configure(proxy) {
          proxy.on('proxyReqWs', (proxyReq) => {
            proxyReq.setHeader('Authorization', `Bearer ${process.env.WS_AUTH_TOKEN}`);
          });
        },
      },
    },
  },
});
