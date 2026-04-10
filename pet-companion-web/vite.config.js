import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.BUILD_BASE || '/companion/',
  build: {
    outDir: process.env.BUILD_OUT_DIR || '../backend-ts/public/companion',
    emptyOutDir: true,
  },
});
