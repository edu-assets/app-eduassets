# Changelog — eduAssets

All versions below v1.0.0 are part of the beta development cycle. Dates are approximate.

## v0.9.9 — Current (August 2026)
- Database indexes on `Emprestimo.status` and `Ocorrencia.status` for faster Dashboard and Control queries.
- `.refine()` quantity validation in the equipment update schema (prevents available+broken > total).
- `AbortController` timeout on the RFID bridge fetch, avoiding hangs when the hardware is offline.
- Flatpickr is now lazy-loaded via dynamic `import()` with a cached promise, reducing the initial bundle size.
- Accessibility: `role="dialog"`, `aria-modal`, and focus trap automatically applied to all modals via `initModals()`.
- Initial Vitest setup (four test files for pure utility functions).

## v0.9.8 (August 2026)
- RFID card auto-login finished end to end: Python bridge (SPI and serial/Arduino), loopback-only WebSocket, and session propagation across tabs.
- The Registrations → Users panel gained the link/regenerate/revoke card flow.
- Synthesized feedback sounds (no external audio files) for detection, success, and error states on the bridge.

## v0.9.5 (July 2026)
- Idle-session timeout (30 min) for Administrator accounts, validated both client- and server-side.
- Dedicated rate limiting for login (password and RFID login share the same limiter).
- Security headers applied globally via `helmet`.

## v0.9.0 (July 2026)
- Full migration of the frontend from vanilla JavaScript to TypeScript, strictly following `skillsJS.md`.
- Restructured into a feature-first architecture (`core` / `features` / `shared` / `types`).
- The Export panel wired up to real export logic (CSV, Excel via SheetJS, PDF via jsPDF + autotable).

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
