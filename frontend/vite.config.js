import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: process.env.BUILD_OUT_DIR || '../backend-ts/public/admin',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:18000',
        changeOrigin: true,
      },
      '/gateway': {
        target: 'http://127.0.0.1:18000',
        changeOrigin: true,
      },
      '/events': {
        target: 'http://127.0.0.1:18000',
        changeOrigin: true,
      },
      '/export': {
        target: 'http://127.0.0.1:18000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:18000',
        changeOrigin: true,
      },
    },
  },
});
