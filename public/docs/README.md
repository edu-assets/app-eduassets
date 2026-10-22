# eduAssets

<div align="center">
  <a href="../../../README.md">
    <img src="../assets/img/eduAssets_banner.png" alt="eduAssets banner" width="100%">
  </a>
</div>

[Root README](../../../README.md) · [Português](LEIAME.md)

> **Status: Beta.** eduAssets is a TypeScript school-equipment loan and inventory application. Authentication, guest read-only access, loans/returns, occurrences, exports and an optional RFID integration are present in the current checkout. No public deployment is assumed by this documentation.

## What it does

eduAssets supports the daily workflows of a small equipment operation:

- register loans and process returns;
- inspect stock and loan history with search/filter;
- record observations, maintenance and broken equipment;
- manage categories, equipment, responsible people and users as an administrator;
- export loan/return and inventory data as CSV, Excel or PDF; and
- use password authentication, Administrator/Editor permissions and a read-only Guest mode.

The frontend is currently TypeScript with native DOM rendering and a feature-first structure. React is a future roadmap item, not a current dependency. Light / Dark / System theme selection is persisted locally.

## Local runtime

```text
Browser :5173 ── Vite proxy ── API :3000 ── PostgreSQL
                                      │
                         optional RFID bridge (loopback only)
                                      └─ provisioner :3001
```

- The backend defaults to **3000**. `PORT` has precedence over `BACKEND_PORT`; if neither yields a usable value, 3000 is used.
- The backend uses `HOST` when set. Otherwise it binds to `127.0.0.1` outside production and `0.0.0.0` in production.
- Vite is served on **`0.0.0.0:5173`** and proxies the API paths and WebSocket path to `127.0.0.1:3000`.
- With an empty `VITE_API_BASE_URL`, the browser uses relative URLs and the Vite proxy in development. A production frontend build requires `VITE_API_BASE_URL`.
- The optional Python bridge exposes its provisioning helper only on **`127.0.0.1:3001`**. It is not a public application endpoint.

## Access model

- **Guest:** public read views; no data mutation.
- **Editor:** authenticated operational actions allowed by the route policy, including loan/return flows and occurrence creation/editing.
- **Administrator:** administrative CRUD, account/password actions and RFID-token provisioning in addition to operational actions.

JWT authentication is sent as `Authorization: Bearer <token>`. Backend authorization is authoritative; frontend disabled controls are only a UX layer. Administrator activity has a 30-minute server-side idle timeout. There is no password-recovery flow; an authenticated user can change their own password with `PATCH /auth/senha`.

## Backend and data model

The API exposes health/root responses, authentication routes, entity CRUD routes and administrator-only RFID-token actions:

- `/health`, `/`;
- `/auth/login`, `/auth/me`, `/auth/senha`, `/auth/rfid`;
- `/categorias`, `/equipamentos`, `/responsaveis`, `/usuarios`, `/emprestimos`, `/ocorrencias`; and
- `/usuarios/:id/rfid-token` for RFID-token provisioning/revocation.

Prisma models are `Categoria`, `Equipamento`, `Responsavel`, `Usuario`, `Emprestimo`, `ItemEmprestimo` and `Ocorrencia`, backed by PostgreSQL. Mutating routes use authentication/administrator middleware; read routes support Guest mode.

## Requirements

- Node.js **>=22.12.0** and npm for both packages;
- PostgreSQL reachable via `DATABASE_URL`;
- `DIRECT_URL` when a provider needs a separate direct connection (the Prisma config falls back to `DATABASE_URL`); and
- compatible Linux/Python/RFID hardware only when the optional bridge is enabled.

The repository does not assume a hosting provider, cloud project, public domain, RLS policy or operational deployment.

## Install and run

From the repository root:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
cp .env.example backend/.env
```

Edit `backend/.env` with at least `DATABASE_URL`, a unique `JWT_SECRET` of 32 or more characters, and `SEED_ADMIN_PASSWORD`. Do not commit secrets. For explicit local development, use `NODE_ENV=development`; outside local development, set `CORS_ORIGIN` to a comma-separated list of allowed frontend origins.

Create `frontend/.env` for the Vite proxy:

```env
VITE_API_BASE_URL=
VITE_RFID_BRIDGE_ENABLED=false
```

Then initialize the database:

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
cd ..
```

The seed **requires `SEED_ADMIN_PASSWORD`** and is idempotent. `SEED_EDITOR_PASSWORD` is optional and creates an editor account only when set. Passwords are read from the environment; this documentation supplies no demo credentials.

Start both processes:

```bash
npm run dev
```

Open `http://localhost:5173`. To run one process, use `cd backend && npm run dev` or `cd frontend && npm run dev`.

For an already-migrated environment, the backend also has `npm run migrate:deploy`. The available build/start sequence is:

```bash
npm run build
cd backend && npm start
```

A built frontend can be inspected with `cd frontend && npm run preview`; this is a local preview, not a deployment procedure.

## Environment reference

### Backend

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Controls development/production behavior. |
| `PORT` / `BACKEND_PORT` | Port selection; `PORT` wins, default 3000. |
| `HOST` | Bind address; default `127.0.0.1`, or `0.0.0.0` in production when absent. |
| `TRUST_PROXY` | Optional explicit Express proxy setting; configure for the actual proxy topology. |
| `CORS_ORIGIN` | Comma-separated allowed origins; required outside local development. |
| `DATABASE_URL` | Required PostgreSQL URL. |
| `DIRECT_URL` | Optional separate direct URL; falls back to `DATABASE_URL`. |
| `JWT_SECRET` | Unique JWT HS256 secret, at least 32 characters. |
| `SEED_ADMIN_PASSWORD` | Required by the seed for the initial administrator password. |
| `SEED_EDITOR_PASSWORD` | Optional seed password for an editor account. |
| `LOG_LEVEL` | Winston log level; template default is `info`. |

### Frontend

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API origin. Empty means Vite proxy in development; required for a production build. |
| `VITE_RFID_BRIDGE_ENABLED` | Enables the browser RFID listener; keep `false` unless the whole RFID path is ready. |

## Optional RFID integration

RFID is **disabled unless `RFID_BRIDGE_ENABLED=true`** on the backend. Enabling the browser listener separately requires `VITE_RFID_BRIDGE_ENABLED=true`. Both backend and bridge must share a random `RFID_BRIDGE_SECRET` of at least 32 characters.

The Python bridge supports `RFID_BACKEND=spi` (default) or `RFID_BACKEND=serial`; the serial mode uses `RFID_SERIAL_PORT` and defaults to `/dev/ttyUSB0`. `EDUASSETS_BACKEND_URL` defaults to `http://localhost:3000`, and `RFID_SOUND_DEVICE` optionally selects an ALSA device.

The backend checks that `/auth/rfid` requests come from loopback and the WebSocket upgrade at `/ws/rfid` is loopback-only. Therefore a Raspberry Pi on the same network is not automatically supported: use a network arrangement that preserves this policy, or run the bridge with the backend on the same host. Firewall/reverse-proxy rules and physical-reader validation are operator responsibilities.

Manual bridge setup on Linux:

```bash
cd rpi/rfid
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export RFID_BRIDGE_SECRET='same-strong-secret-as-backend'
export EDUASSETS_BACKEND_URL='http://localhost:3000'
python3 rfid_admin_bridge.py
```

The process starts the local provisioning service at `127.0.0.1:3001/provision`. The shipped systemd unit expects `/opt/eduassets-rfid`, a dedicated `eduassets` user, a virtual environment and `/etc/eduassets/rfid_bridge.env` with mode 600. The repository does not install that service or certify target hardware/GPIO behavior.

## Scripts

| Location | Command | Purpose |
| --- | --- | --- |
| root | `npm run dev` | Run backend and frontend concurrently. |
| root | `npm run build` | Build backend, then frontend. |
| backend | `npm run dev` | Watch-mode API server. |
| backend | `npm run build` | TypeScript build. |
| backend | `npm start` | Run `dist/src/server.js`. |
| backend | `npm run migrate:deploy` | Apply existing migrations. |
| backend | `npm test` | Run the configured Node test script; no result is asserted here. |
| frontend | `npm run dev` | Vite on port 5173. |
| frontend | `npm run build` | Build `dist/`. |
| frontend | `npm run preview` | Preview `dist/` locally. |
| frontend | `npm run typecheck` | Run `tsc --noEmit`. |
| frontend | `npm test` / `npm run test:watch` | Run Vitest once or in watch mode; no result is asserted here. |

## Limitations

- There is no operational public deployment, remote migration, secret rotation or cloud database configuration in this repository.
- Provider-side RLS, grants and anonymous PostgREST exposure are not established or verified here and require a separate privacy/security review.
- Production requires `CORS_ORIGIN`; proxy deployments also need an intentional `TRUST_PROXY` and network policy.
- RFID needs real hardware, Linux dependencies, loopback reachability, a strong shared secret and an explicit network policy. Password login remains the supported path when it is off.
- The data model tracks quantities rather than individual serialized units, and roles are limited to Guest/Editor/Administrator behavior.
- Password recovery is not implemented. The return-date field does not currently change the backend's current-time semantics.
- Remaining manual validation includes target hardware, proxy/deployment behavior and selected browser flows; no test or deployment result is implied by this document.

## Language versions

- English: this file.
- Português: [LEIAME.md](LEIAME.md).
- Repository overview: [root README](../../../README.md).
