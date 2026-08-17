import { defineConfig } from 'vitest/config';

/**
 * One runner for the whole workspace. `pnpm test:safety` filters this same set
 * down to the `INV-` invariant tests, which CI runs as a separate, named gate.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          root: './packages/core',
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'geo',
          root: './packages/geo',
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'db',
          root: './packages/db',
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'web',
          root: './apps/web',
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
    ],
  },
});
