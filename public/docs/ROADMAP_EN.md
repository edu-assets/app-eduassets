# Roadmap — eduAssets

> **Checkout status (October 23, 2026): Beta.** Code fixes, tests and deployment templates are present. The operator validated the deployment: Cloudflare Pages frontend, Oracle VM API behind Nginx, proxied DNS, external HTTPS, and the CORS preflight. Off-host backups, a restore drill, monitoring, and complete functional QA remain before leaving Beta.

## Completed in code and locally verified

- [x] TypeScript/Vite frontend: 36 tests across 9 files and local build passed; tests cover readiness, Guest/Editor/Administrator synchronization, server revocation, and immediate local logout cleanup.
- [x] Prisma/Express backend: no in-memory fallback, required JWT secret, validated config, TypeScript build, `prisma validate` with omitted/empty `DIRECT_URL`, and 30 unit tests passed.
- [x] JWT/roles and current DB user authorization reviewed; admin timeout uses jti and fails closed; PostgreSQL-backed `sessionVersion` revokes tokens on logout/password change; 401 clears the session while 403/network errors remain distinct.
- [x] Guest Mode preserved with minimized, server-side allowlisted projections; `/responsaveis` and `/usuarios` require auth; backend authorizes writes.
- [ ] Loan/return and occurrence transaction/locking paths, logout and password-change revocation require the HTTP/concurrency suite and six migrations against disposable PostgreSQL; they passed in hosted run `39875293195`.
- [x] F4 — dependent stores/forms refresh after creation; F5 — local-calendar date filters; F6 — 401 without hydrated user; F7 — selected return time sent as an offset-aware timestamp; locally reviewed/tested where applicable.
- [x] `/health` liveness and timeout-bounded, non-disclosing PostgreSQL `/ready`; RFID bridge remains disabled by default.
- [x] Local/production environment templates, multi-stage Docker, Compose, Nginx config, non-destructive backup/restore scripts, and GitHub Actions CI added; the API was run on the Oracle VM with remote PostgreSQL on Neon.
- [x] P0/P1 remediation: optional `DIRECT_URL`, API CSP, direct Node entrypoint, production CI smoke workflow, and public Nginx RFID blocks implemented; external HTTPS and CORS preflight were validated in the deployment.

> Local PostgreSQL was unavailable, but hosted CI validated migrations and HTTP integration against disposable PostgreSQL. The real deployment uses Neon; this still does not equal a restore drill, privacy approval, or hardware certification.

## Next steps toward v1.0.0

- [ ] Run GitHub CI and resolve any runner-specific incompatibilities.
- [x] Execute integration/race/auth tests against disposable PostgreSQL in the production smoke workflow; run `39875293195` passed.
- [ ] Perform browser QA for CORS/CSP, guest anonymization/exports, login/timeout, loan/occurrence flows, responsiveness and accessibility.
- [x] Validate Compose/API, Nginx, firewall, domain, Cloudflare Pages, API origin, HTTPS and CORS on the target host; review Cloudflare real-IP ranges and rate limits with current ranges still remains.
- [ ] Complete secret rotation, monitoring, alerts and availability evidence; frontend, DNS, API origin and HTTPS were validated in the Beta deployment.
- [ ] Test encrypted off-host backup and restore to a new empty DB; approve RPO/RTO, retention and incident procedure.
- [ ] Complete accessibility, UI coverage, privacy threat review, DB isolation and synthetic-data policy.

## External blockers and scope

- [ ] **Database:** Neon is configured as the deployment's remote PostgreSQL. Off-host backup, controlled `migrate deploy`, and restore evidence in a new empty database are still required.
- [x] **Host/domain:** Oracle VM, Cloudflare Pages, DNS, HTTPS, inbound firewall, and real `CORS_ORIGIN` were verified in the Beta deployment; real-IP ranges, WAF/rate limiting, and monitoring remain operational reviews.
- [ ] **Privacy/access:** backend Guest DTOs have unit coverage; end-to-end validation on synthetic demo data and review of provider grants/policies remain necessary. The current app has no direct PostgREST route; if the provider exposes that service, disable unintended anonymous access and review grants/RLS separately.
- [ ] **Hardware:** no Raspberry Pi/GPIO reader, serial reader, target OS or systemd installation was available; RFID remains optional/off in the public template. Physical cards are clonable identifiers, so the bridge must remain local and protected.
- [ ] **Scale:** admin inactivity state is process-local and assumes one instance; shared session/activity state is required before horizontal scaling.
- [x] **Release:** `app.eduassets.tech` and `api.eduassets.tech` are the operational endpoints for the Beta deployment; templates remain examples for new installations.

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
