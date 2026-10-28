# Changelog — eduAssets

This changelog preserves dated development and deployment records. The current product version is **official 1.0.0**, released on October 28, 2026; earlier entries remain historical.

## v1.0.0 — Official release — October 28, 2026

- Official 1.0.0 status was applied across the app, API, documentation, and site repositories; the frontend package already used version 1.0.0 and the site package was aligned.
- The browser client consolidated cookie-first sessions with `HttpOnly`, `SameSite=Lax`, `Secure` on HTTPS, and `Origin` validation for mutations, with controlled legacy Bearer compatibility and one-time-code RFID exchange.
- The `#login` entry prevents protected content from appearing before authorization; Guest Mode uses server-side allowlisted projections and API routes enforce permissions.
- The documentation center uses one catalog for the About page and modal; bilingual guides can load from the canonical host and have a local fallback.
- The public site received stronger challenge/solution hierarchy, one-line navigation, a stack with local SVG logos, grouped documentation, and a profile card fitted to its portrait and social links.
- Operational and hosting guides were revised alongside architecture, data, API, and operations documentation; the changelog keeps the October 23 topology as a dated snapshot, not a current service-health statement.

## Sessions, entry gate, and documentation center — October 26–27, 2026
- The browser negotiates session support through `/auth/session-capabilities`; when available, sessions use an `HttpOnly`, `SameSite=Lax` cookie, `Secure` on HTTPS, and Origin validation for state-changing requests. Bearer remains for compatibility/fallback only.
- Cookie-mode RFID login exchanges a one-time code that expires in 30 seconds for a browser session; legacy channels may still use the JWT event.
- The `#login` entry route prevents the protected app from flashing during bootstrap; direct `#app` access waits for session/Guest authorization.
- Theme/language controls in Settings were aligned with the login screen; PT/EN UI copy now describes explicit save behavior.
- The About page and documentation modal now render cards from the same registry. Bilingual API/development guides and deployment/hosting guides are registered. The `site-eduassets` portfolio now reads Markdown from `docs.eduassets.tech` in an accessible dialog with search, table of contents, internal links, and sanitization; the reader supports PT-BR/EN.
- READMEs, manuals, architecture, data model, hosting, roadmap, and changelogs were reconciled with source/recorded CI; release instructions now distinguish schema-free updates from backup-and-migrate releases.

## Deployment and hosting documentation — October 23, 2026
- Frontend deployed on Cloudflare Pages at `app.eduassets.tech`; the landing page remains separate at `eduassets.tech`.
- API deployed at `api.eduassets.tech` on the Oracle Cloud Ubuntu VM, behind Nginx and using remote PostgreSQL on Neon.
- Fixed the inbound block caused by a generic `REJECT` before the UFW chains: explicit TCP 80/443 rules were inserted before the block without exposing port 3000.
- Validated external HTTPS and the `OPTIONS /ready` CORS preflight with `Access-Control-Allow-Origin: https://app.eduassets.tech`.
- The Pages CSP now allows the official Cloudflare Web Analytics beacon at `static.cloudflareinsights.com`.
- Added the bilingual `Hospedagem.md` and `Hosting.md` runbooks and registered them in the frontend documentation view.
- That dated record identified off-host backup, a restore drill, monitoring/alerts, and the final real-data review as operational follow-up topics.

## Remediation and release preparation — October 22, 2026
- Removed in-memory authentication/persistence fallbacks and the default JWT secret; environment validation fails early for missing/invalid database, secret, CORS, port and production proxy trust.
- Fixed the Administrator idle timeout using the JWT identifier and fail-closed handling when activity state cannot be established; an incorrect current password no longer clears the session. Logout and password changes now update a PostgreSQL-backed `sessionVersion` to revoke older JWTs, including across instances.
- Loans: create/edit/return operations serialize transactional state changes; repeated return updates stock once. Occurrence resolution/deletion locks concurrent transitions to prevent duplicate inventory adjustments.
- Guest Mode remains available with endpoint-specific allowlisted DTOs for equipment, loans and occurrences; personal names, free-text notes and issue details are omitted/masked; responsible-party and user listings require authentication.
- The return flow sends the user's selected offset-aware timestamp; legacy clients may omit it and use server time. Export filters use inclusive local-calendar boundaries.
- `/health` is liveness and `/ready` probes PostgreSQL with a timeout; responses do not reveal connection/provider details. Backend build and Prisma Client generation work without `DIRECT_URL` via the `DATABASE_URL` fallback.
- Added separate local env templates and production template, a multi-stage backend Dockerfile and Compose file with loopback-only host binding, RFID disabled, sanitized Nginx/Cloudflare proxy template, backup/restore scripts restricted to empty DB, PostgreSQL CI workflow and integration/race tests.
- Seed display names are synthetic and existing passwords are not overwritten; seed execution remains explicit and requires configured `SEED_*` variables.
- Local `npm run dev` no longer applies migrations automatically; `npm run dev:db` is the explicit development-database preparation command. The frontend waits for `/ready` and stops with the backend if the backend process fails.
- Sandbox verification recorded on Oct 22: 36 frontend tests across 9 files, 30 backend unit tests, frontend typecheck/build, backend TypeScript build, Prisma generation, JSON/YAML validation and `prisma validate` passed. PostgreSQL, migrations, seed, the 9 HTTP/concurrency integration tests, production image build and readiness were not run locally because those services/tools were unavailable in the sandbox; hosted CI run `39875293195` passed both `verify` and `production-smoke`, including those checks.
- That record covers the listed CI and sandbox checks; it does not report browser/hardware test results or continuous verification of external services. No remote database, public resource or production environment was accessed or changed in that documentation session.

- Added bounded loan/occurrence payloads, raised user/password-change minimum to 12 characters, handled async feature initialization failures, and escaped documentation TOC/search text.
- The dependency audit recorded in that run found three high-severity findings in the Prisma 6 development/migration toolchain; this historical note is not a current audit result.

## v0.9.9 (August 2026)
- Database indexes on `Emprestimo.status` and `Ocorrencia.status` for faster Dashboard and Control queries.
- `.refine()` quantity validation in the equipment update schema (prevents available+broken > total).
- Flatpickr is now lazy-loaded via dynamic `import()` with a cached promise, reducing the initial bundle size.
- Accessibility: `role="dialog"`, `aria-modal`, and focus trap automatically applied to all modals via `initModals()`.
- Initial Vitest setup for pure utility functions.

## v0.9.8 (August 2026)
- RFID card auto-login flow implemented in the Python bridge (SPI and serial/Arduino), loopback WebSocket, and cross-tab session propagation.
- The Registrations → Users panel gained the link/regenerate/revoke card flow.
- Synthesized feedback sounds (no external audio files) for detection, success, and error states on the bridge.

## v0.9.5 (July 2026)
- Idle-session timeout (30 min) for Administrator accounts, implemented on both the client and server.
- Dedicated rate limiting for login (password and RFID login share the same limiter).
- Security headers applied globally via `helmet`.

## v0.9.0 (July 2026)
- Full migration of the frontend from vanilla JavaScript to TypeScript, strictly following `skillsJS.md`.
- Restructured into a feature-first architecture (`core` / `features` / `shared` / `types`).
- The Export panel wired up to real export logic (CSV, Excel via ExcelJS, PDF via jsPDF + autotable).

## v0.8.0 (July 2026)
- JWT authentication implemented, with Guest Mode (public read access, restricted write access).
- Permission differentiation between Administrator and Editor on both frontend and backend.
- Dark Mode with automatic OS detection, manual override, and persistence.

## v0.6.0 (July 2026)
- Stock decremented/incremented atomically via Prisma transactions, eliminating race conditions on simultaneous loans.
- Full Control panel: four tabs (Observation, Maintenance, Broken, Resolved) with a creation/edit modal and resolution flow.

## v0.4.0 (June 2026)
- First backend version with all CRUD routes (Category, Equipment, Responsible party, User, Loan, Occurrence) and the initial Prisma schema.
- Frontend starts consuming the real API, replacing the mocked in-memory state used during the early prototypes.

## v0.2.0 (June 2026)
- Working prototype in vanilla JavaScript, with in-memory state (no backend), used to validate the loan/return UX flow.
- Initial design system: color palette, semantic CSS custom-property tokens, typography (Poppins/Inter).

## v0.1.0 (June 2026)
- Initial project idea and wireframes, motivated by the manual, physical-spreadsheet equipment control process at Senac.
- First static HTML/CSS mockups.
