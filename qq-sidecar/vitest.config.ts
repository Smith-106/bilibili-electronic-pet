import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      processingConcurrency: 1,
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
});
