# Roadmap — eduAssets

> **Checkout status (Oct 22, 2026): Beta.** Code fixes, tests and deployment templates are present. The PostgreSQL suite ran against a local disposable database; Docker/Compose and hosted CI have not run. No public infrastructure was deployed or verified.

## Completed in code and locally verified

- [x] TypeScript/Vite frontend: 35 tests across 9 files and local build passed; tests cover Guest/Editor/Administrator synchronization, server revocation, and immediate local logout cleanup.
- [x] Prisma/Express backend: no in-memory fallback, required JWT secret, validated config, TypeScript build, `prisma validate`, and 24 unit tests passed.
- [x] JWT/roles and current DB user authorization reviewed; admin timeout uses jti and fails closed; PostgreSQL-backed `sessionVersion` revokes tokens on logout/password change; 401 clears the session while 403/network errors remain distinct.
- [x] Guest Mode preserved with minimized, server-side allowlisted projections; `/responsaveis` and `/usuarios` require auth; backend authorizes writes.
- [x] Loan/return and occurrence transaction/locking paths, logout and password-change revocation passed nine HTTP/concurrency integration tests against local disposable PostgreSQL 16; all six migrations applied to an empty test database.
- [x] F4 — dependent stores/forms refresh after creation; F5 — local-calendar date filters; F6 — 401 without hydrated user; F7 — selected return time sent as an offset-aware timestamp; locally reviewed/tested where applicable.
- [x] `/health` liveness and timeout-bounded, non-disclosing PostgreSQL `/ready`; RFID bridge remains disabled by default.
- [x] Local/production environment templates, multi-stage Docker, Compose, Nginx config, non-destructive backup/restore scripts, and GitHub Actions CI added. Execution against real services is not verified.

> Local disposable PostgreSQL evidence validates code and migrations but is not provider staging, a production DB, hosted CI, a production-browser test, privacy approval, or hardware certification.

## Next steps toward v1.0.0

- [ ] Run GitHub CI and resolve any runner-specific incompatibilities.
- [x] Execute nine integration/race/auth tests against local disposable PostgreSQL 16; repeat in the hosted runner after triggering CI.
- [ ] Perform browser QA for CORS/CSP, guest anonymization/exports, login/timeout, loan/occurrence flows, responsiveness and accessibility.
- [ ] Validate Docker/Compose and Nginx on the target host; run `nginx -t`; check firewall, Cloudflare real-IP ranges and per-client rate limits. Without current ranges, clients may be grouped under an edge IP.
- [ ] Provision/verify DNS, Vercel project, API origin, Full (strict) TLS, secret rotation, monitoring and availability.
- [ ] Test encrypted off-host backup and restore to a new empty DB; approve RPO/RTO, retention and incident procedure.
- [ ] Complete accessibility, UI coverage, privacy threat review, DB isolation and synthetic-data policy.

## External blockers and scope

- [ ] **Database:** only a local disposable PostgreSQL database was used; no remote URL/credentials were provided and no remote migration/seed was applied. Before production: dedicated DB, backup, `migrate deploy` in staging and restore evidence.
- [ ] **Host/domain:** Oracle VM, Vercel, DNS, Cloudflare, firewall, TLS certificate and real `CORS_ORIGIN` were neither verified nor changed. The guide contains templates only.
- [ ] **Privacy/access:** backend Guest DTOs have unit coverage; end-to-end validation on synthetic demo data and review of provider grants/policies remain necessary. The current app has no direct PostgREST route; if the provider exposes that service, disable unintended anonymous access and review grants/RLS separately.
- [ ] **Hardware:** no Raspberry Pi/GPIO reader, serial reader, target OS or systemd installation was available; RFID remains optional/off in the public template. Physical cards are clonable identifiers, so the bridge must remain local and protected.
- [ ] **Scale:** admin inactivity state is process-local and assumes one instance; shared session/activity state is required before horizontal scaling.
- [ ] **Release:** proposed domains and template URLs are placeholders, not live endpoints.

## v1.0.0 — Stable release

Not reached. Requires green hosted CI, PostgreSQL integration and Docker tests, staging smoke tests, restore drill, manual QA, reviewed external configuration, and recorded privacy/security evidence. Until then, the correct status is **Beta**.

## Post-1.0 (v2 — medium/long term)

- [ ] Migrate to React (current frontend uses TypeScript and native DOM rendering).
- [ ] Track physical units by serial number (inventory is aggregated today).
- [ ] Password recovery (currently only authenticated password changes).
- [ ] More granular roles than Administrator/Editor.
- [ ] Additional themes and functional notifications (current notification UI does not persist/deliver alerts).

## Ideas without a committed timeline

- Automated periodic reports.
- Mobile companion app and QR as an alternative to RFID.
