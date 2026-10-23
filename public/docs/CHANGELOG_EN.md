# Changelog — eduAssets

All versions below v1.0.0 belong to the beta cycle; earlier dates are approximate. The latest section records checkout changes, not published releases.

## Beta deployment and hosting documentation — October 23, 2026
- Frontend deployed on Cloudflare Pages at `app.eduassets.tech`; the landing page remains separate at `eduassets.tech`.
- API deployed at `api.eduassets.tech` on the Oracle Cloud Ubuntu VM, behind Nginx and using remote PostgreSQL on Neon.
- Fixed the inbound block caused by a generic `REJECT` before the UFW chains: explicit TCP 80/443 rules were inserted before the block without exposing port 3000.
- Validated external HTTPS and the `OPTIONS /ready` CORS preflight with `Access-Control-Allow-Origin: https://app.eduassets.tech`.
- The Pages CSP now allows the official Cloudflare Web Analytics beacon at `static.cloudflareinsights.com`.
- Added the bilingual `Hospedagem.md` and `Hosting.md` runbooks and registered them in the frontend documentation view.
- Off-host backup, restore drill, monitoring/alerts, and the final real-data review remain pending.

## Remediation and release preparation — October 22, 2026
- Removed in-memory authentication/persistence fallbacks and the default JWT secret; environment validation fails early for missing/invalid database, secret, CORS, port and production proxy trust.
- Fixed the Administrator idle timeout using the JWT identifier and fail-closed handling when activity state cannot be established; an incorrect current password no longer clears the session. Logout and password changes now update a PostgreSQL-backed `sessionVersion` to revoke older JWTs, including across instances.
- Loans: create/edit/return operations serialize transactional state changes; repeated return updates stock once. Occurrence resolution/deletion locks concurrent transitions to prevent duplicate inventory adjustments.
- Guest Mode remains available with endpoint-specific allowlisted DTOs for equipment, loans and occurrences; personal names, free-text notes and issue details are omitted/masked; responsible-party and user listings require authentication.
- The return flow sends the user's selected offset-aware timestamp; legacy clients may omit it and use server time. Export filters use inclusive local-calendar boundaries.
- `/health` is liveness and `/ready` probes PostgreSQL with a timeout; responses do not reveal connection/provider details. Backend build and Prisma Client generation work without `DIRECT_URL` via the `DATABASE_URL` fallback.
- Added separate local env templates and production template, a multi-stage backend Dockerfile and Compose file with loopback-only host binding, RFID disabled, sanitized Nginx/Cloudflare proxy template, backup/restore scripts restricted to empty DB, PostgreSQL CI workflow and integration/race tests.
- Seed display names are synthetic and existing passwords are not overwritten; seed execution remains explicit and requires configured `SEED_*` variables.
- Sandbox verification on Oct 22: 36 frontend tests across 9 files, 30 backend unit tests, frontend typecheck/build, backend TypeScript build, Prisma generation, JSON/YAML validation and `prisma validate` passed. PostgreSQL, migrations, seed, the 9 HTTP/concurrency integration tests, production image build and readiness were not run locally because those services/tools were unavailable in the sandbox; hosted CI run `39875293195` passed both `verify` and `production-smoke`, including those checks.
- Browser QA, hardware, Cloudflare Pages, DNS, firewall, Cloudflare on the target host, certificates, backups/restore and monitoring remain unverified. No remote database, public resource or production environment was accessed or changed.

- Added bounded loan/occurrence payloads, raised user/password-change minimum to 12 characters, handled async feature initialization failures, and escaped documentation TOC/search text.
- Backend audit recorded: `npm audit --omit=dev` still reports the Prisma chain in the current lockfile; 3 high remain in the Prisma 6 development/migration toolchain, with no forced major upgrade.

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
