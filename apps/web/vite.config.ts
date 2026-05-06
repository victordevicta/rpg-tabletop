import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@eldertable/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@eldertable/dice-engine': resolve(__dirname, '../../packages/dice-engine/src/index.ts'),
      '@eldertable/rules-engine': resolve(__dirname, '../../packages/rules-engine/src/index.ts'),
      '@eldertable/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
});
