import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: process.env.BUILD_OUT_DIR || '../backend-ts/public/admin',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
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
})
