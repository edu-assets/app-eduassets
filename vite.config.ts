import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [],
  publicDir: 'public',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth': 'http://127.0.0.1:3000',
      '/categorias': 'http://127.0.0.1:3000',
      '/equipamentos': 'http://127.0.0.1:3000',
      '/responsaveis': 'http://127.0.0.1:3000',
      '/usuarios': 'http://127.0.0.1:3000',
      '/emprestimos': 'http://127.0.0.1:3000',
      '/ocorrencias': 'http://127.0.0.1:3000',
      '/health': 'http://127.0.0.1:3000',
      '/ws': {
        target: 'ws://127.0.0.1:3000',
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
