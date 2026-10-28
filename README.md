# eduAssets Frontend

[Português](README_PT.md) · [Backend API repository](https://github.com/edu-assets/eduAssets)

> **Status: Official version 1.0.0.** This repository contains the browser application for eduAssets. It is a Vite/TypeScript single-page application; the API and database are maintained separately.

## Overview

The frontend supports school-equipment inventory and loan workflows, including equipment and stock views, loan registration and returns, occurrence management, administrative screens, CSV/Excel/PDF exports, guest read-only access, and optional RFID-related UI. It also provides Portuguese and English interfaces and persistent light/dark theme selection.

The application uses feature-first TypeScript modules and native DOM rendering. The backend remains the security boundary: frontend route guards and disabled controls are usability measures, not authorization. In production, the app communicates with the API at `https://api.eduassets.tech`; authentication uses the backend's secure session flow where supported.

## Repository layout

- `src/core/` — application-wide services, API client, routing, state, theme and localization;
- `src/features/` — feature-specific screens and workflows;
- `src/shared/` — shared UI and utilities;
- `src/types/` — shared TypeScript types;
- `public/` — static assets, security headers and project documentation;
- `scripts/` — frontend asset and icon utilities.

## Requirements

- Node.js **22.12 or newer** and npm;
- a running eduAssets API for full local workflows. In the current development setup, Vite proxies API paths to `http://127.0.0.1:3000`.

## Local development

```bash
npm ci
cp .env.example .env
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`. Keep the API base empty for local development so Vite uses its proxy:

```env
VITE_API_BASE_URL=
VITE_RFID_BRIDGE_ENABLED=false
```

Run the API separately. Its source currently lives in the `backend/` directory of [`edu-assets/eduAssets`](https://github.com/edu-assets/eduAssets). Do not put passwords, tokens, or other secrets in `VITE_*` variables; these values are public in the built browser assets.

## Available commands

```bash
npm run dev        # Vite development server at http://localhost:5173
npm run typecheck  # TypeScript check
npm test           # Frontend test suite
npm run build      # Production build to dist/
npm run preview    # Preview the production build locally
```

## Cloudflare Pages deployment

The production site is served at `https://app.eduassets.tech`. For the Cloudflare Pages project connected to this repository, use:

- Production branch: `main`;
- Root directory: `/` (repository root);
- Build command: `npm run build`;
- Build output directory: `dist`;
- Node.js: `22.13.0` or another supported version satisfying `>=22.12.0`.

Set these public build-time variables for Production and Preview as needed:

```env
VITE_API_BASE_URL=https://api.eduassets.tech
VITE_RFID_BRIDGE_ENABLED=false
```

`public/_headers` supplies the static response security headers copied into the build output. The frontend build does not deploy or configure the API, database, DNS, or Cloudflare account settings.

## Documentation

The canonical bilingual guides are maintained in [`edu-assets/docs-eduassets`](https://github.com/edu-assets/docs-eduassets/tree/main/public/docs) and hosted at https://docs.eduassets.tech. The About modal fetches Markdown from an immutable docs commit pinned in `src/core/docs/docsService.ts` via `raw.githubusercontent.com`; `VITE_DOCS_BASE_URL` is not supported. Markdown in `public/docs/` is used only when the pinned request fails or returns a non-success response. The production CSP must allow the API and `https://raw.githubusercontent.com`.

Main guides in the central repository:

- [User manual](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/USER_MANUAL.md) · [Manual do usuário](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/MANUAL_USUARIO.md)
- [Architecture](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/ARCHITECTURE.md) · [Arquitetura](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/ARQUITETURA.md)
- [API reference](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/API_REFERENCE.md) · [Referência da API](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/REFERENCIA_API.md)
- [Development](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/DEVELOPMENT.md) · [Desenvolvimento](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/DESENVOLVIMENTO.md)
- [Deployment](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/DEPLOYMENT.md) · [Implantação](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/GUIA_IMPLANTACAO.md)
- [Hosting](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/Hosting.md) · [Hospedagem](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/Hospedagem.md)
- [Operations and recovery](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/OPERATIONS_AND_RECOVERY.md) · [Operação e recuperação](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/OPERACAO_E_RECUPERACAO.md)
- [Changelog](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/CHANGELOG_EN.md) · [Histórico de alterações](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/CHANGELOG.md)

For API and infrastructure changes, consult the backend source and its documentation in [`edu-assets/eduAssets`](https://github.com/edu-assets/eduAssets).
