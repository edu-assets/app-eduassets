# Frontend development and validation

This repository contains the eduAssets browser application. The API source is maintained separately in [`edu-assets/eduAssets`](https://github.com/edu-assets/eduAssets), under `backend/`. Keep the frontend and backend repositories independently installable and deployable.

## Requirements

- Node.js **22.12 or newer** and npm;
- Git;
- a running local or test API at `127.0.0.1:3000` for authenticated workflows and end-to-end manual checks.

## Install and configure

```bash
npm ci
cp .env.example .env
```

Use the default local setting so Vite proxies API requests to the backend:

```env
VITE_API_BASE_URL=
VITE_RFID_BRIDGE_ENABLED=false
```

Run the API separately from the `edu-assets/eduAssets` repository. Its local backend configuration, PostgreSQL setup and migration instructions are documented in that repository and in the [API reference](API_REFERENCE.md). Never place a password, token, database URL or other secret in a `VITE_*` variable; Vite embeds these values into public browser assets.

## Run locally

```bash
npm run dev
```

The Vite development server listens on port **5173**. Its proxy forwards API paths and the supported WebSocket path to `127.0.0.1:3000`. `VITE_API_BASE_URL` may be set to another API origin for a preview, but it is public configuration and must match that API's CORS policy.

## Checks

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` writes the static production site to `dist/`; `public/_headers` is copied into the output. These checks do not deploy the site or connect to production services.

## Structure and conventions

- `src/core/` — application-wide API client, authentication, routing, state, localization, theme and utilities;
- `src/features/` — screens and user workflows organized by feature;
- `src/shared/` — shared interface elements and utilities;
- `src/types/` — TypeScript contracts;
- `public/docs/` — public Markdown rendered by the in-app Documentation Center;
- `src/core/docs/registry.ts` — single source of truth for About-panel and documentation-modal entries.

Do not treat UI guards as authorization: the backend remains the security boundary. Follow the project's shared `skills.md` and `architectureskills.md` when those files are available in the project context.

## Contribution checklist

Before proposing a change, run the relevant checks above, inspect `git diff --check`, and state any validation that could not be performed (for example, browser/manual checks, real proxy behavior, or RFID hardware). Use synthetic fixtures. Never commit `.env` files, cookies, JWTs, database dumps or real personal data.

## References

See [README](README.md), [Architecture](ARCHITECTURE.md), [API Reference](API_REFERENCE.md), [Data Model](DATA_MODEL.md), and the [Deployment Guide](DEPLOYMENT.md).
