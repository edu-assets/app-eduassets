# Roadmap — eduAssets

> **Checkout status (2026-10-22): Beta.** The code remediation was applied and verified locally, but no public deployment, remote database operation, applied migration, secret rotation, or Raspberry Pi 5 validation was performed. This roadmap does not describe the project as *production-ready*.

## Completed and verified

- [x] TypeScript/Vite frontend organized under `core`/`features`/`shared`; typecheck and build passed, and 27 frontend tests passed across 5 files.
- [x] TypeScript/Express backend with typed Prisma and no in-memory/demo authentication fallback; backend build and 9 tests passed.
- [x] JWT authentication with a required secret of at least 32 characters, backend authorization for Administrator/Editor and guest read access, rate limiting, security headers, and asynchronous admin middleware.
- [x] Expired-session handling through 401 responses and administrator inactivity timeout; network errors and 403 responses remain distinct.
- [x] Verified fixes for HTML serialization/escaping, PT/EN translation, return-item editing (spinner and original state), and CSV export (escaping, BOM, formulas, and inclusive filtering), with corresponding unit cases.
- [x] Optional RFID path is protected by a feature flag, shared secret, and empty-UID validation; the code path was verified, but not the physical reader or production network.
- [x] Existing functional scope confirmed in code: loans/returns, transactional stock operations, occurrences, administrative CRUD, Light/Dark/System themes, exports, and read-only Guest Mode.

> The items above are conclusions from code, tests, builds, and local checks. They are not end-to-end testing in a hosted environment, privacy approval, or hardware certification.

## Toward v1.0.0 (short term)

### Future work

- [ ] Expand automated coverage (Vitest plus service/integration tests) for stock, validation, and critical workflows; the current tests are a foundation, not complete coverage.
- [ ] **F4 — registration/refresh:** standardize and verify in the browser that lists refresh after create/edit/delete for every entity. The registration screen currently reloads its list after creation, but patterns vary and the full database-backed flow was not reproduced.
- [ ] **F5 — exports:** validate calendar/time-zone boundaries and opening files in Excel and LibreOffice; the local unit cases passed.
- [ ] **Accessibility and Guest UX:** review keyboard access, focus, contrast, screen readers, messages, and affordances for blocked actions; guest-action styling/experience (D5) has not received manual QA.
- [ ] Establish a reproducible clean-checkout pipeline: lockfile installs, an explicit separation between build and migration, and a stage that provides the Prisma CLI when needed; `npm ci --omit=dev` and the deployment flow have not been established or tested.
- [ ] Configure and validate on the chosen host the `CORS_ORIGIN` allowlist, proxy/Nginx behavior (compression, caching, and HTTP/2), `PORT`/`HOST`/`TRUST_PROXY`, and simultaneous frontend-backend operation.
- [ ] Perform the first public deployment only after the gates above, then run smoke tests for the frontend, API, authentication, exports, and operational flows.

### External blockers / decisions required

- [ ] **PostgREST/RLS and privacy:** obtain authorized access to a test PostgreSQL/Supabase project, review anonymous access, grants, RLS, views, and public payloads endpoint by endpoint, and obtain an external privacy audit/approval. No credentials or target policies are available; no remote change was made.
- [ ] **Database and migration:** provide a disposable PostgreSQL database, confirm backup/recovery, and run `prisma migrate deploy` in a non-production environment before calling migrations validated.
- [ ] **Pi 5/GPIO/systemd:** install on the target OS, validate the GPIO library, service account/paths/environment, run `systemd-analyze verify`, and test real card read/write. No Raspberry Pi 5 or target OS is available here.
- [ ] **F7 — return date:** decide whether the date selected in the UI represents a historical return. The current server/backend contract stores the current time; after the decision, update the model, API, validation, UI, tests, and documentation.
- [ ] **Hosting and `VITE_API_BASE_URL`:** obtain access to the hosting project, set the real API origin in the frontend build, and validate preview/production. A production build fails clearly when `VITE_API_BASE_URL` is missing, but no hosted project was verified.
- [ ] **RFID in production:** test authorized loopback/proxy exposure, firewall policy, and the end-to-end hardware behavior; code-level flags and security limits do not replace this external validation.

## v1.0.0 — Stable release

This milestone is **not reached yet**. Consider it only when essential features have appropriate test and documentation coverage, and the external blockers — privacy/RLS, disposable migration, hosting/configuration, accessibility, F4, F7, and Pi/RFID when enabled — have recorded evidence. Until then, the correct status remains **Beta**.

## Post-1.0 (v2 — medium/long term)

- [ ] Full migration of the frontend to React, reusing the existing `core`/`features`/`shared` layers (the current frontend is TypeScript with native DOM rendering).
- [ ] Individual serial-number tracking (today control is by aggregated quantity, not by physical unit).
- [ ] Password recovery ("Forgot my password") — currently only an authenticated change is possible via the Security panel.
- [ ] More granular permissions (per panel/action), beyond the current two levels (Administrator/Editor).
- [ ] A theme picker beyond Light/Dark/System.
- [ ] Real notifications (today the Settings interface is visual only).

## Ideas under consideration (no committed timeline)

- Scheduled reports (automatic periodic export by email).
- Mobile companion app for QR-code scanning as an alternative to RFID.
