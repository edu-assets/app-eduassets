# Changelog — eduAssets

All versions below v1.0.0 are part of the beta development cycle. Dates are approximate. The unnumbered section records later remediation work in the selected checkout.

## Recent remediations — October 22, 2026
- Removed in-memory/demo authentication and persistence fallbacks; the backend uses `PrismaClient` and propagates database errors instead of hiding them.
- `JWT_SECRET` is now required and must contain at least 32 characters; there is no default secret. The admin middleware now awaits authentication before authorizing.
- Security strengthened: `helmet` denies framing; CORS requires an allowlist outside local development; the RFID WebSocket is initialized only with `RFID_BRIDGE_ENABLED=true` and accepts loopback connections only.
- The RFID bridge avoids selection/write operations when no UID is available and uses wait limits for reader operations; behavior with real hardware was not validated.
- Runtime contract aligned: the backend honors `PORT` (then `BACKEND_PORT`) and defaults to 3000; the Vite frontend uses 5173 and proxies to 3000. Production frontend builds fail clearly when `VITE_API_BASE_URL` is absent.
- Prisma configuration falls back to `DATABASE_URL` when `DIRECT_URL` is absent; `prisma generate` was verified, but no database connection or migration was run.
- CSV exports now include a BOM, delimiter/quote/line-break escaping, and formula-prefix neutralization; the API client clears the authenticated session on every 401 response.
- Fixed safe HTML attribute serialization, a missing translation, and the return-flow spinner/stale state; CSV and HTML test cases were added.
- A root lockfile was added; the backend and frontend declare Node `>=22.12.0`. The RFID systemd service no longer depends on machine-specific paths and accounts, but its installation and device verification were not performed.
- Local validations recorded in the report: 27 frontend tests across five files, 9 backend tests, frontend typecheck and build, backend build, `prisma generate`, Python syntax check, and `git diff --check`.
- No deployment, remote database operation, migration, secret rotation, or RFID/Raspberry Pi hardware test took place. Production/proxy behavior and systemd installation were not verified; remote grants/RLS/PostgREST were not changed, and historical return-date semantics were not implemented.

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
