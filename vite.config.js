import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  server: {
    port: 5173,
    // allowedHosts: true
  },
  build: {
    outDir: 'dist'
  }
});