import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    coverage: {
      include: ['src/components/**', 'src/lib/**'],
      provider: 'v8',
      thresholds: { branches: 90, functions: 90, lines: 90, statements: 90 },
    },
    environment: 'jsdom',
    globals: true,
    hookTimeout: 120_000,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30_000,
  },
});
