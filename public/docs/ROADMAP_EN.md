# Roadmap — eduAssets

> **Checkout status (Oct 22, 2026): Beta.** Code fixes, unit coverage, prepared integration tests, CI workflow and deployment templates are present. PostgreSQL/Docker/hosted CI have not been run; no public infrastructure was deployed or verified.

## Completed in code and locally verified

- [x] TypeScript/Vite frontend: 29 tests across 6 files, local typecheck and build passed.
- [x] Prisma/Express backend: no in-memory fallback, required JWT secret, validated config, local build without `DIRECT_URL`, and 20 unit tests.
- [x] JWT/roles and current DB user authorization reviewed; admin timeout uses jti and fails closed when needed activity state is absent; 401 clears the session while 403/network errors remain distinct.
- [x] Guest Mode preserved with minimized, server-side allowlisted projections; `/responsaveis` and `/usuarios` require auth; backend authorizes writes.
- [x] Transaction/locking paths for loan edits/returns and occurrence resolution/deletion reviewed for duplicate transitions/inventory changes; concurrent HTTP tests are written for CI but still need execution on PostgreSQL.
- [x] F4 — dependent stores/forms refresh after creation; F5 — local-calendar date filters; F6 — 401 without hydrated user; F7 — selected return time sent as an offset-aware timestamp; locally reviewed/tested where applicable.
- [x] `/health` liveness and timeout-bounded, non-disclosing PostgreSQL `/ready`; RFID bridge remains disabled by default.
- [x] Local/production environment templates, multi-stage Docker, Compose, Nginx config, non-destructive backup/restore scripts, and GitHub Actions CI added. Execution against real services is not verified.

> Local evidence is not a live database test, hosted CI, production browser test, privacy approval, or hardware certification.

## Next steps toward v1.0.0

- [ ] Run the GitHub CI workflow and fix any PostgreSQL, migration, Docker or Compose incompatibilities. It was not triggered in this task.
- [ ] Execute all five integration/race tests against a disposable isolated PostgreSQL service. This sandbox did not start a database connection.
- [ ] Perform browser QA for CORS/CSP, guest anonymization/exports, login/timeout, loan/occurrence flows, responsiveness and accessibility.
- [ ] Validate Docker/Compose and Nginx on the target host; run `nginx -t`; check firewall, Cloudflare real-IP ranges and per-client rate limits. Without current ranges, clients may be grouped under an edge IP.
- [ ] Provision/verify DNS, Vercel project, API origin, Full (strict) TLS, secret rotation, monitoring and availability.
- [ ] Test encrypted off-host backup and restore to a new empty DB; approve RPO/RTO, retention and incident procedure.
- [ ] Complete accessibility, UI coverage, privacy threat review, DB isolation and synthetic-data policy.

## External blockers and scope

- [ ] **Database:** no URL/credentials were provided and no DB connection was opened; migrations and seed were not applied. Before production: dedicated DB, backup, `migrate deploy` in staging and restore evidence.
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
