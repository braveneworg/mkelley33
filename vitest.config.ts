/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import react from '@vitejs/plugin-react';
import { defineConfig, type ViteUserConfig } from 'vitest/config';

export default defineConfig((): ViteUserConfig => {
  const withCoverage = process.argv.includes('--coverage');

  return {
    plugins: [react()],
    resolve: {
      tsconfigPaths: true, // No aliases — vi.mock in vitest.setup.ts handles next/* modules
      conditions: ['import', 'module', 'browser', 'default'],
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    server: {
      open: true,
    },

    // Cache directory for faster subsequent builds
    cacheDir: 'node_modules/.vite',

    // Optimize build for faster test startup
    esbuild: {
      target: 'node24', // Use latest Node.js target for faster builds in test environment
    },
    test: {
      coverage: {
        provider: 'v8',
        thresholds: { branches: 95, functions: 95, lines: 95, statements: 95 },
        // In CI, only generate the reporters consumed downstream
        // (json-summary for coverage action + regression check, json for PR diff, text for log).
        // html/lcov/clover are large and unused in CI, and write significant disk I/O.
        reporter: process.env.CI
          ? ['text', 'json', 'json-summary']
          : ['text', 'json', 'json-summary', 'html'],
        // Coverage is gathered exclusively from `.ts`/`.tsx` first-party source.
        // Plain `.js`/`.jsx`/`.cjs`/`.mjs`/`.json` files are tooling, generated
        // output, or third-party shims — explicitly drop them so they cannot
        // inflate or deflate the headline metrics.
        exclude: [
          '**/*.{js,jsx,cjs,mjs,json}',
          '**/*.css',
          // Configuration files
          '**/*.config.{ts,js,mjs,cjs}',
          '**/vitest.config.ts',
          '**/next.config.ts',
          '**/postcss.config.mjs',
          '**/eslint.config.mjs',
          '**/tsconfig*.json',

          // Type declarations and interfaces
          '**/*.d.ts',
          '**/types/**',

          // Setup and tooling
          '**/vitest.setup.ts',

          // Build outputs and dependencies
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.next/**',
          '**/coverage/**',

          // Test files themselves
          '**/*.{test,spec}.{ts,tsx,js,jsx}',

          // Root layout — module-level code (env validation, HTTPS warning)
          // is not testable in jsdom/node environments
          '**/app/layout.tsx',

          // Mocks directory
          '**/__mocks__/**',
        ],
      },
      css: false,
      pool: 'vmThreads',
      maxWorkers: '75%',
      isolate: true,
      fileParallelism: true,
      environment: 'jsdom',
      globals: true,
      sequence: {
        shuffle: { files: false, tests: true },
        seed: (() => {
          if (process.env.VITEST_SEED) {
            const parsed = parseInt(process.env.VITEST_SEED, 10);
            return Number.isNaN(parsed) || parsed <= 0 ? 42 : parsed;
          }
          return 42;
        })(),
      },

      // Disable typecheck by default for faster runs
      typecheck: {
        enabled: false,
      },

      // Fail fast on first error in CI for faster feedback
      bail: process.env.CI ? 1 : 0,
      clearMocks: true,
      // Optimize dependency pre-bundling
      deps: {
        optimizer: {
          web: {
            include: [
              '@testing-library/react',
              '@testing-library/jest-dom',
              '@testing-library/user-event',
              'react',
              'react-dom',
            ],
          },
        },
        // Inline small dependencies for faster loading
        interopDefault: true,
      },

      // Reporter optimizations
      reporters: process.env.CI ? ['default', 'junit'] : ['default'],
      outputFile: process.env.CI ? { junit: './test-results.xml' } : undefined,

      watch: !process.env.CI,
      hookTimeout: 120_000,
      include: ['src/**/*.spec.{ts,tsx}'],
      setupFiles: ['./vitest.setup.ts'],
      testTimeout: 5_000,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/coverage/**',
        '**/*.config.{ts,js,mjs,cjs}',
        '**/setupTests.ts',
        // The Playwright suite, which lives in the repo-root `e2e/` only.
        // Anchored rather than `**/e2e/**`, which also swallowed the unit
        // specs beside the harness's own modules in `src/lib/e2e/`.
        'e2e/**',
        '**/.claude/**',
      ],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('test'),
      'process.env.AUTH_SECRET': JSON.stringify('test-secret-key-for-testing-purposes-only'),
      'process.env.AUTH_URL': JSON.stringify('http://localhost:3000'),
    },
  };
});
