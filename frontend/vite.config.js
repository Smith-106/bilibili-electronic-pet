import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '../app/static/frontend',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:18000',
        changeOrigin: true,
      },
    },
  },
});
