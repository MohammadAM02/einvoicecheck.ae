import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    // mongodb-memory-server may download a mongod binary on first run.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    pool: 'forks',
    fileParallelism: false,
    setupFiles: ['./test/helpers/setupEnv.ts'],
    reporters: ['default'],
  },
});
