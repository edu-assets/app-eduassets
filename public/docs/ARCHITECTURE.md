# Architecture — eduAssets

## Overview

eduAssets is split into three independent layers that communicate over HTTP/WebSocket:

```
RFID Card → MFRC522 Reader → Python Bridge Service → Backend (Express) → Frontend (Vite/TS)
                                                              ↕
                                                        PostgreSQL (Prisma)
```

See the component diagram and the RFID login sequence diagram in this section's images.

## Frontend

**Feature-first, layered architecture**, fully written in TypeScript, framework-free — just Vite + ES modules.

```
frontend/src/
├── core/       infrastructure: API client, auth guards, layout, state stores, UI primitives, utils
├── features/   one folder per screen (dashboard, emprestimo, devolucao, controle, cadastros, exportar, config, seguranca, perfil, auth)
├── shared/     reusable components not owned by any single feature
└── types/      centralized TypeScript interfaces
```

Each `feature/` follows a strict 4-file pattern, with a one-directional data flow:

| File | Responsibility |
|---|---|
| `index.ts` | initialization only (grabs DOM elements, builds state, calls `attachEvents`) |
| `events.ts` | listens to UI events and orchestrates calls to `service.ts` |
| `service.ts` | business rules and API calls — never touches the DOM |
| `render.ts` / `templates.ts` | `templates.ts` only returns HTML strings; `render.ts` updates the DOM |

Golden rule: **`events → service → render`**, never `events → render` directly for business operations. Features never import from other features — shared logic goes to `core/` or `shared/`.

All dynamic HTML generation goes through the `html\`\`` helper (an auto-escaping tagged template), with `raw()` as an explicit escape hatch for already-trusted HTML.

Global state uses a simple per-entity *store* pattern (`subscribe`/`notify`) — no Redux/Zustand — keeping the app lightweight and free of external state-management dependencies.

## Backend

Node.js + Express 5, strict TypeScript, Prisma as the ORM over PostgreSQL.

```
backend/src/
├── routes/       one router per entity (equipamentos, emprestimos, ocorrencias, usuarios...)
├── middleware/    auth (requireAuth/requireAdmin), security (helmet, rate limit), errorHandler
├── lib/           jwt, estoque (atomic stock logic), validate, adminActivity, rfidBridge/Token
└── schemas/       Zod input validation on every mutating route
```

Notable points:

- **Authentication**: a JWT is signed on login and validated on every mutating endpoint via `requireAuth`/`requireAdmin`.
- **Atomic stock**: decrements use `updateMany` with a `WHERE quantidadeDisponivel >= quantidade` guard, avoiding race conditions without an explicit lock. Insufficient-stock errors throw a typed `EstoqueInsuficienteError`, handled centrally.
- **Loopback-only WebSocket** (`/ws/rfid`): used only to propagate automatic card-based login to open tabs on the same device — never exposed externally.
- **Centralized error handling**: `errorHandler.ts` maps known Prisma error codes (not found, invalid reference, duplicate value) to consistent HTTP responses.

## RFID Bridge (optional)

A Python service that runs on the Raspberry Pi (native SPI) or is relayed through an Arduino Nano (USB serial), behind a common `RfidReaderBase` interface. It talks to the backend through an HTTP route protected by a shared secret and restricted to loopback connections (`127.0.0.1`) — the physical reader and the backend need to be on the same machine (or the bridge reaching `localhost`).

## Notable architectural decisions

- **No frontend framework (v1)**: a deliberate choice for a portfolio piece — it demonstrates DOM, TypeScript, and architecture fundamentals without relying on React/Vue. Migrating to React + TS is planned for v2, reusing the existing `core`/`features`/`shared` layers (only the rendering layer changes).
- **Guest Mode by default**: since the project is public, every read is open; only writes require authentication — enforced both in the UI (`data-requires-auth`/`data-requires-admin`) and in the backend (the UI restriction is UX-only; the backend is the actual security boundary).
- **Hardware decoupled from the core application**: RFID is entirely optional — the system works fully via password with no reader attached at all.
