import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

// package.json is the single source of truth for the product version (see scripts/set-version.mjs).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/** Replaces %APP_VERSION% in index.html at build/serve time so the static HTML is right before any JS runs. */
function appVersionHtml(): Plugin {
    return {
        name: 'eduassets-app-version-html',
        transformIndexHtml: {
            order: 'pre',
            handler: (html) => html.replaceAll('%APP_VERSION%', pkg.version)
        }
    };
}

export default defineConfig({
  plugins: [appVersionHtml()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
      '/notificacoes': 'http://127.0.0.1:3000',
      '/sync': 'http://127.0.0.1:3000',
      '/health': 'http://127.0.0.1:3000',
      '/ready': 'http://127.0.0.1:3000',
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
