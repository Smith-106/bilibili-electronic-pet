import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.js'],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      processingConcurrency: 1,
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js'],
    },
  },
});
