import { defineConfig } from 'vitest/config';

export default defineConfig({
  publicDir: 'public',
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/auth': 'http://127.0.0.1:3001',
      '/categorias': 'http://127.0.0.1:3001',
      '/equipamentos': 'http://127.0.0.1:3001',
      '/responsaveis': 'http://127.0.0.1:3001',
      '/usuarios': 'http://127.0.0.1:3001',
      '/emprestimos': 'http://127.0.0.1:3001',
      '/ocorrencias': 'http://127.0.0.1:3001',
      '/health': 'http://127.0.0.1:3001',
      '/ws': {
        target: 'ws://127.0.0.1:3001',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
});