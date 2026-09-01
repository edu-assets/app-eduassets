import { defineConfig } from 'vitest/config';

export default defineConfig({
  publicDir: 'public',
  server: {
    port: 5173,
    // allowedHosts: true
  },
  build: {
    outDir: 'dist'
  },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts']
  }
});