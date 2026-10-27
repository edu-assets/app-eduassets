# Frontend development and validation

This guide applies to the browser application in [`edu-assets/app-eduassets`](https://github.com/edu-assets/app-eduassets). The API source is maintained separately in [`edu-assets/eduAssets`](https://github.com/edu-assets/eduAssets), under `backend/`. The canonical bilingual Markdown is maintained in [`edu-assets/docs-eduassets`](https://github.com/edu-assets/docs-eduassets).

## Requirements

Use Node.js **22.12 or newer** and npm. A running local/test API at `127.0.0.1:3000` is needed for authenticated workflows and complete manual checks.

## Install and configure

```bash
npm ci
cp .env.example .env
```

For local development, leave the API and documentation base URLs empty; Vite proxies API requests, and the documentation modal uses the bundled Markdown fallback:

```env
VITE_API_BASE_URL=
VITE_RFID_BRIDGE_ENABLED=false
VITE_DOCS_BASE_URL=
```

Run the API separately from `edu-assets/eduAssets`. Its local backend configuration, PostgreSQL setup, and migration instructions are documented in the central [API reference](API_REFERENCE.md). Never put a password, token, database URL, or other secret in a `VITE_*` variable; Vite embeds these values in public browser assets. After `docs-eduassets` becomes publicly readable, the production build may set `VITE_DOCS_BASE_URL=https://raw.githubusercontent.com/edu-assets/docs-eduassets/main/public`; the modal falls back locally if the remote file is unavailable.

## Run and validate

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

The Vite development server listens on port **5173** and forwards API paths and the supported WebSocket path to `127.0.0.1:3000`. A production Cloudflare Pages build uses repository root `/`, build command `npm run build`, and output directory `dist`. `public/_headers` is copied to the output. These commands do not deploy or connect to production services.

## Structure and conventions

`src/core/` contains application-wide services, API client, authentication, routing, state, localization, and theme. `src/features/` owns screen workflows; `src/shared/` contains reusable UI; `src/types/` centralizes TypeScript contracts. `src/core/docs/registry.ts` is the single source of truth for documents shown in About; the canonical Markdown and PDF assets are in the docs repository under `public/docs/`. The copy in the frontend repository is a transition fallback and should not become a second editing source.

Do not treat UI guards as authorization: the backend remains the security boundary. Use synthetic fixtures and never commit `.env` files, cookies, JWTs, database dumps, or real personal data.

## References

See the [frontend repository README](https://github.com/edu-assets/app-eduassets/blob/main/README.md), [Architecture](ARCHITECTURE.md), [API Reference](API_REFERENCE.md), [Data Model](DATA_MODEL.md), and [Deployment Guide](DEPLOYMENT.md).
