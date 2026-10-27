# Development and validation — eduAssets

> For contributors working from the repository checkout. Environment values are local; never commit production secrets or include them in screenshots, tests, or documentation.

## Requirements

- Node.js **22.12 or newer** and npm;
- local or disposable PostgreSQL for running the API and migrations;
- Git; Docker only for image/Compose workflows and deployment validation.

The monorepo has three npm projects: the root (`concurrently` helper), `backend`, and `frontend`. Install each dependency tree separately:

```bash
npm ci
npm --prefix backend ci
npm --prefix frontend ci
```

## Local configuration

Copy `.env.example` to `backend/.env` and fill in local values. Point `DATABASE_URL` to a development PostgreSQL database and set `JWT_SECRET` to a random value of at least 32 characters. `DIRECT_URL` is optional and falls back to `DATABASE_URL`. Do not use production databases for tests or exploratory migrations.

For a standalone frontend build that does not use the Vite proxy, set `VITE_API_BASE_URL` to the API origin (for example, `http://127.0.0.1:3000`). RFID is disabled by default; do not enable it without an isolated network, bridge, and secret.

## Run locally

From the repository root, `npm run dev` starts the frontend and API together. To start them separately:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

Vite uses port 5173 and proxies local API requests to the backend on port 3000. The backend also accepts `PORT`, which takes precedence over `BACKEND_PORT`. The optional local RFID provisioning helper, when installed separately, uses `127.0.0.1:3001`; it is not the web API.

## Tests, types, and builds

```bash
# Frontend
npm --prefix frontend test
npm --prefix frontend run typecheck
npm --prefix frontend run build

# Backend (load local values from backend/.env)
JWT_SECRET='replace-with-a-local-secret-at-least-32-characters' npm --prefix backend test
npm --prefix backend run build

# Combined root build (backend before frontend)
npm run build
```

Backend integration tests and migrations require disposable PostgreSQL configured according to the scripts and CI jobs. Never run `migrate:deploy`, `db:seed`, or integration tests against an operational database. `npm run build` includes `prisma generate`; generating a client does not apply database migrations.

## Structure and conventions

- `frontend/src/core`: shared infrastructure, state, API, authentication, routing, and utilities.
- `frontend/src/features`: interface modules and business workflows, organized by feature.
- `frontend/src/shared`: components and helpers reused across features.
- `backend/src/routes`, `middlewares`, `controllers`, `services`, `schemas`, and `lib`: HTTP transport, authorization, validation, and backend rules.
- `backend/prisma`: schema, migrations, and seed.
- `rpi/rfid`: optional physical-reader bridge; it needs validation on the target hardware/OS.
- `frontend/public/docs`: public Markdown loaded by the in-app Documentation Center. When adding a document, register it in `frontend/src/core/docs/registry.ts`; the About page and documentation modal use the same registry.

Also follow the project's shared `skills.md` and `architectureskills.md`. Do not rely on duplicated frontend permission rules: the backend is the security boundary.

## Pull requests and evidence

Before submitting changes, run the relevant checks above, review `git diff --check`, and describe checks that could not be run (for example, physical RFID hardware, a real proxy, backup restoration, or external provider configuration). Use synthetic fixture data. Do not include `.env` files, database dumps, cookies, JWTs, or real personal data.

## References

Also see [README](README.md), [Architecture](ARCHITECTURE.md), [API Reference](API_REFERENCE.md), [Data Model](DATA_MODEL.md), and [Deployment Guide](DEPLOYMENT.md).
