# eduAssets Frontend

[Português](LEIAME.md) · [English root README](https://github.com/edu-assets/app-eduassets/blob/main/README.md)

> **Status: Beta.** This repository contains the browser application only. The Node.js API and database integration are maintained in [`edu-assets/eduAssets`](https://github.com/edu-assets/eduAssets).

## Scope

The frontend is a TypeScript/Vite single-page application for the eduAssets school-equipment inventory and loan system. It provides inventory and loan workflows, returns, occurrences, administrative screens, exports, Portuguese/English localization, theme settings, and guest read-only views. Authorization remains enforced by the backend API, not by browser controls.

## Local use

Requirements: Node.js **22.12 or newer** and npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

Keep `VITE_API_BASE_URL` empty for local development so Vite proxies API requests to `127.0.0.1:3000`; run the API separately from the backend repository. Set `VITE_RFID_BRIDGE_ENABLED=false` unless an isolated RFID setup has been configured. `VITE_*` values are public build-time configuration—never put secrets in them.

Run frontend checks with `npm run typecheck`, `npm test`, and `npm run build`.

## Deployment

The production frontend is hosted by Cloudflare Pages from `edu-assets/app-eduassets`, with repository root `/`, build command `npm run build`, and output directory `dist`. Production API requests use `https://api.eduassets.tech`. See [Hosting and operations](Hosting.md) and the [deployment guide](DEPLOYMENT.md).

## Guides

- [User manual](USER_MANUAL.md) · [Manual do usuário](MANUAL_USUARIO.md)
- [Architecture](ARCHITECTURE.md) · [Arquitetura](ARQUITETURA.md)
- [API reference](API_REFERENCE.md) · [Referência da API](REFERENCIA_API.md)
- [Development](DEVELOPMENT.md) · [Desenvolvimento](DESENVOLVIMENTO.md)
- [Operations and recovery](OPERATIONS_AND_RECOVERY.md) · [Operação e recuperação](OPERACAO_E_RECUPERACAO.md)
- [Changelog](CHANGELOG_EN.md) · [Histórico de alterações](CHANGELOG.md)
