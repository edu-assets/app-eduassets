# Architecture — eduAssets

> This document describes the architecture currently implemented in the source tree. It does not describe a deployed production topology, and it does not infer modules or database features that are not present in the code.

## System boundary and topology

The application has a browser frontend, an HTTP API, a PostgreSQL database accessed through Prisma, and an optional RFID path:

```text
Browser (Vite dev server or built assets)
        │ HTTP / JSON
        ▼
Express application (backend :3000)
        │ Prisma
        ▼
PostgreSQL

Optional RFID path:
RFID reader → Python bridge → POST /auth/rfid ──► backend
                                             │
                                             └─► WS /ws/rfid → open browser tabs

Browser/admin → POST 127.0.0.1:3001/provision → Python bridge → RFID reader
```

The RFID path is optional and disabled by default. Password login remains the supported path when no reader is attached. The public deployment template forces RFID off.

## Runtime boundaries and ports

| Component | Actual binding/configuration | Responsibility |
|---|---|---|
| Backend | validated `PORT` or `BACKEND_PORT` (in that precedence), defaulting to **3000**; `HOST` defaults to `127.0.0.1` outside production and `0.0.0.0` when `NODE_ENV=production` | Express HTTP API, health endpoint, routing, authentication and WebSocket upgrade handling |
| Vite development server | **0.0.0.0:5173** | Serves the frontend and proxies the configured API paths to `http://127.0.0.1:3000`; `/ws` is proxied with WebSocket support to `ws://127.0.0.1:3000` |
| RFID provisioning server | **127.0.0.1:3001** | Local-only `/provision` HTTP endpoint used to queue a token write on the reader |
| RFID login WebSocket | Backend path `/ws/rfid` | Optional event channel from the backend to browser tabs; it is created only when `RFID_BRIDGE_ENABLED=true` |

The Vite proxy is a development configuration, not a general network policy. It lists the application API paths explicitly (`/auth`, `/categorias`, `/equipamentos`, `/responsaveis`, `/usuarios`, `/emprestimos`, `/ocorrencias`, `/health`) and separately proxies `/ws`.

## Frontend

The frontend is a TypeScript application built with Vite and native ES modules. The entrypoint is `frontend/src/main.ts`:

1. On `DOMContentLoaded`, it initializes theme and internationalization.
2. It runs authentication initialization and the initial loads for equipment, responsible people, loans, and occurrences with `Promise.allSettled`.
3. A rejected initial data load produces an error toast; the remaining initialization functions are then run independently so one feature failure does not stop every feature.
4. It initializes navigation, UI helpers, the administrator session timeout, the feature modules, the RFID listener, profile/security/configuration screens, and documentation.

The observed frontend layers are:

- **`core/`**: infrastructure such as the API client/configuration, token and domain stores, authentication/session behavior, layout, UI, HTML utilities, and RFID listening.
- **`features/`**: screen-level modules (authentication, dashboard, loans/returns, equipment and registration control, export, configuration, security, profile, and documentation) composed by `main.ts`.
- The entrypoint does not use a framework bootstrap or a global state library. Domain state is exposed through stores with `get...`, loading/mutation functions, and `subscribe` functions for equipment, loans, occurrences, responsible people, theme, and i18n.

### State and API flow

- `tokenStore` keeps the current bearer token in memory and mirrors it to `localStorage` under `eduassets_token`. Clearing the token removes that key. The source does not implement a refresh-token flow.
- `apiClient` reads `VITE_API_BASE_URL` through `apiConfig`, adds `Authorization: Bearer <token>` when available, sends JSON, parses structured API errors, and emits `eduassets:sessao-expirada` after an HTTP 401.
- In development, an empty API base makes requests relative, allowing the Vite proxy to forward them. A production frontend build fails if `VITE_API_BASE_URL` is empty.
- The RFID listener has a separate build-time gate: it connects only when `VITE_RFID_BRIDGE_ENABLED=true`, derives the WebSocket URL from the API base (or the current browser host), reconnects after 3 seconds, stores the received token, validates it with `/auth/me`, and reloads the page.

### HTML safety contract

`core/utils/html.ts` provides the `html` tagged template. Interpolated values are escaped through `escapeHtml`; `attr()` validates the attribute name and escapes its value. `raw()` is an explicit opt-out for HTML that the caller already trusts. Using `raw()` is therefore a deliberate trust boundary, not an automatic sanitizer.

## Backend

The backend is a strict TypeScript Node.js/Express application. `server.ts` loads dotenv, creates an HTTP server around `app`, conditionally attaches the RFID WebSocket bridge, and listens on the resolved host and port.

### Application pipeline

`app.ts` assembles the request pipeline in this order:

1. Helmet security headers (`frameguard: deny`, cross-origin resource policy `cross-origin`; CSP is explicitly disabled in this configuration).
2. CORS. Local development is permissive only when `NODE_ENV=development` and `HOST` is loopback. `CORS_ORIGIN` entries must be exact HTTP(S) origins; production requires a non-empty allowlist. Production also requires explicit `TRUST_PROXY`.
3. Request logging.
4. `express.json({ limit: '100kb' })`.
5. The global rate limiter.
6. `/health`, bounded DB-backed `/ready`, `/`, and the application routers.
7. The not-found handler and centralized error handler.

The mounted routers are `/auth`, `/categorias`, `/equipamentos`, `/responsaveis`, `/usuarios`, `/emprestimos`, and `/ocorrencias`. The GET endpoints for categories, equipment, loans and occurrences allow optional auth and apply minimized endpoint-specific DTOs to anonymous responses. Responsible-party and user listings require authentication; all mutations have route-level authorization and validation. The UI is not the security boundary.

### Authentication and authorization

- Password login is `POST /auth/login`. The JWT module signs HS256 tokens for **8 hours** and accepts only HS256 on verification. The payload must contain a numeric `sub` and `nivelAcesso` equal to `ADMINISTRADOR` or `EDITOR`.
- `JWT_SECRET` is mandatory and must have at least 32 characters; the application fails during JWT module initialization if it is missing or weak.
- `requireAuth` requires `Authorization: Bearer ...`, verifies the token, confirms that the user still exists in PostgreSQL, and refreshes the access level from the database before placing it in `req.user`.
- `requireAdmin` composes `requireAuth` and requires the current database level to be `ADMINISTRADOR`. The users router is administrator-only. Loan and occurrence mutations require `requireAuth` and input validation. A wrong current password on `PATCH /auth/senha` returns a business error without logging the session out.
- Administrator inactivity is limited to 30 minutes. Backend activity tracking is a process-memory `Map`, so the behavior is consistent for one backend instance only; horizontal scaling requires shared state. The frontend also logs an administrator out after 30 minutes without activity and reacts to the API client's 401 event.
- `POST /auth/rfid` is rate-limited, validates its input, and is not a JWT-authenticated browser route. The card stores a random 32-character opaque lookup credential; only its SHA-256 hash is persisted in `Usuario.rfidTokenHash`, not a JWT. Successful lookup still broadcasts a short-lived signed JWT to accepted local WebSocket clients; the card credential remains clonable at the physical layer, so the complete flow must stay isolated and disabled in public deployment. The service requires a loopback source address and a constant-time match of `X-RFID-Bridge-Secret` against `RFID_BRIDGE_SECRET`, hashes the 32-character RFID token with SHA-256, looks up `Usuario.rfidTokenHash`, and publishes a signed JWT event when the card is recognized.

### Persistence

`prisma.ts` exports one `PrismaClient` and a `runTransaction` helper. The standard interactive transaction limits are **15,000 ms timeout** and **5,000 ms max wait**; an isolation level can be supplied by the caller.

The Prisma datasource is PostgreSQL and reads `DATABASE_URL` and optional `DIRECT_URL` (falls back to `DATABASE_URL`). The schema currently contains `Categoria`, `Equipamento`, `Responsavel`, `Usuario`, `Emprestimo`, `ItemEmprestimo`, and `Ocorrencia`, with the access/status enums declared in the schema. Status indexes exist for loans and occurrences, and RFID credentials are stored as an optional unique hash on `Usuario`.

There are **no RLS policies in the Prisma schema**. Authorization is implemented in application code and route middleware; the database schema must not be read as proof of row-level isolation.

## RFID bridge and WebSocket behavior

### Backend WebSocket

`rfidBridge.ts` creates a `ws` server with `noServer: true` and handles HTTP upgrades only for `/ws/rfid`. It accepts only `127.0.0.1`, `::1`, or the IPv4-mapped loopback address `::ffff:127.0.0.1`. `publicarLoginRfid` broadcasts the signed login event to open loopback clients.

The backend flag is exact: **the WebSocket server is attached only when `RFID_BRIDGE_ENABLED === 'true'`**. The public Docker Compose service forces this flag off and does not publish/proxy `/ws`. The frontend listener has its own `VITE_RFID_BRIDGE_ENABLED === 'true'` gate. Both sides therefore need the appropriate flag for browser delivery; enabling only the Vite flag cannot create a backend WebSocket endpoint.

Loopback is a source-address check, not a replacement for a firewall, network segmentation, or a correctly configured reverse proxy. A proxy must preserve the intended trust boundary and route `/ws` deliberately; the Vite proxy setting alone does not secure an externally reachable deployment.

### Python service and provisioning

`rpi/rfid/rfid_admin_bridge.py`:

- Sends passive scans as `POST {EDUASSETS_BACKEND_URL}/auth/rfid`, with the token as hexadecimal JSON and `X-RFID-Bridge-Secret`; the default backend URL is `http://localhost:3000` and the request timeout is 3 seconds.
- Requires `RFID_BRIDGE_SECRET` with at least 32 characters and compares the provisioning header with `hmac.compare_digest`.
- Runs the provisioning HTTP server on `127.0.0.1:3001`. `POST /provision` accepts a token of length 32, queues it, waits up to 35 seconds for the reader operation, and returns `201`, `500`, or `504` for written, failed, or timed-out operations.
- Uses reader block `8`; the reader write waits up to 30 seconds. Passive reads use a 1-second polling timeout and apply a 1.5-second physical debounce. `RFID_BACKEND` selects the reader backend and defaults to `spi`.

The systemd unit `eduassets-rfid.service` describes an installation under `/opt/eduassets-rfid`, runs as the unprivileged `eduassets` user/group, loads `/etc/eduassets/rfid_bridge.env`, requires that file to have mode `600`, restarts on failure, and applies `NoNewPrivileges`, `PrivateTmp`, and `UMask=0077`. The unit file is a deployment definition; it is not evidence that the service is currently installed or running.

## Configuration and limits

| Variable / setting | Current behavior or limit |
|---|---|
| `PORT`, `BACKEND_PORT` | Backend port selection; validates configured values, `PORT` wins, defaults to `3000` only when absent |
| `HOST` | Backend bind host; defaults to `127.0.0.1`, or `0.0.0.0` in production |
| `NODE_ENV` | Controls production host/trust-proxy behavior and the local-development CORS exception |
| `CORS_ORIGIN` | Exact comma-separated HTTP(S) origins; required in production/outside explicit local development |
| `TRUST_PROXY` | Production requires an explicit validated value; `true` is rejected; otherwise defaults to `false` outside production |
| `JWT_SECRET` | Required, minimum 32 characters |
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL datasource URLs read by Prisma; DATABASE_URL is required at startup except for `NODE_ENV=test`, DIRECT_URL is optional |
| `RFID_BRIDGE_ENABLED` | Backend WS bridge is enabled only for the exact value `true` |
| `VITE_API_BASE_URL` | Frontend API origin; empty is allowed in development, required for a production build |
| `VITE_RFID_BRIDGE_ENABLED` | Frontend RFID listener is enabled only for the exact value `true` |
| `EDUASSETS_BACKEND_URL` | Python bridge backend URL; default `http://localhost:3000` |
| `RFID_BRIDGE_SECRET` | Required by the Python bridge and backend RFID login; minimum 32 characters |
| `RFID_BACKEND` | Reader backend selector; default `spi` |
| JSON body size | Express request body limit is `100kb` |
| JWT lifetime | `8h` |
| Admin inactivity | `30min`, with backend state held in process memory; single instance only |
| Prisma transaction | `timeout=15s`, `maxWait=5s` by default |
| Rate limits | Global: 300 requests/15 min; login: 10/15 min; RFID login: 60/15 min; password change: 10/15 min; RFID provisioning: 5/15 min |

## Explicit non-claims

- This document does not claim RLS, a deployed production environment, or a production reverse-proxy/firewall configuration.
- `127.0.0.1` restrictions reduce the accepted source addresses but do not replace network policy or proxy configuration.
- The Vite proxy is for development only. Repository release templates target Vercel static frontend + Docker API behind Nginx/Cloudflare, but no infrastructure, DNS, certificate or deployment was verified. See the bilingual deployment guides.
- RFID is optional, and the application remains usable through password authentication without the reader service.
