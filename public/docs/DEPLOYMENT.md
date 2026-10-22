# Deployment and operations (English)

> **Status: preparation only.** The repository contains deployment templates, but no Vercel project, Oracle Cloud instance, DNS, Cloudflare origin, database, certificate, firewall, backup job, or monitoring account has been verified or changed. `app.eduassets.tech` and `api.eduassets.tech` remain proposed hostnames. Do not use this guide as evidence of a live service.

## Selected topology

The intended baseline is a static frontend on Vercel and a single backend Docker service on a dedicated VM behind host Nginx and Cloudflare Full (strict). PostgreSQL is external and dedicated to this deployment. The backend container listens on `0.0.0.0:3000` inside Docker but is published only as `127.0.0.1:3000` on the VM. RFID is disabled on the public instance. Do not connect a demo to operational data.

```text
Browser → Vercel static frontend → Cloudflare HTTPS → Nginx :443
                                                   → 127.0.0.1:3000 Docker API → PostgreSQL
```

### Prerequisites (operator actions)

1. Choose verified frontend/API DNS names and provision a dedicated PostgreSQL database/user with least privilege, automated provider backups, and a tested restore destination. Do not share credentials or databases with a school kiosk or public demo.
2. Provision the VM, Docker Engine/Compose, Nginx, PostgreSQL client tools, and a non-root deployment account. In Oracle Cloud NSG/Security Lists and the host firewall, expose only HTTPS (preferably Cloudflare source ranges only) and explicitly managed SSH. Do not expose 3000, 3001, or PostgreSQL publicly.
3. Obtain origin TLS for the actual API hostname. In Cloudflare, set **Full (strict)**. Never commit a private key. Verify certificate subject, chain, validity dates and hostname before loading it into Nginx; establish renewal and expiry alerts.
4. Copy `.env.production.example` to `.env.production` with mode `0600`; set the verified origin, allowlist, strong external `JWT_SECRET`, and dedicated DB URLs. Never add production secrets to Git, frontend variables, build args, or Docker layers. `DIRECT_URL` may be omitted; Prisma config falls back to `DATABASE_URL`.
5. Configure the current Cloudflare IP ranges in `/etc/nginx/snippets/eduassets-cloudflare-realip.conf` using one `set_real_ip_from` directive per published range. Trust `CF-Connecting-IP` only from those ranges. Re-check/update the list when Cloudflare changes it; the repo intentionally does not embed a potentially stale allowlist.

## Build, migrate, start

On the VM, from a reviewed release checkout:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
# Edit only after DNS/database/origin values are verified.
docker compose -f docker-compose.production.yml build api migrate
# Take and verify a fresh backup before schema changes.
set -a; . ./.env.production; set +a
DATABASE_URL="$DATABASE_URL" BACKUP_DIR=./backups ./deploy/scripts/backup-postgres.sh
# Confirm the dump exists and is non-empty; ideally perform a restore drill to a separate empty DB.
docker compose -f docker-compose.production.yml --profile release run --rm migrate
docker compose -f docker-compose.production.yml up -d api
docker compose -f docker-compose.production.yml ps
curl --fail https://VERIFIED_API_HOST/health
curl --fail https://VERIFIED_API_HOST/ready
```

`api` is a multi-stage image with production dependencies only, runs as the unprivileged Node user, drops Linux capabilities, uses a read-only root filesystem and has a restart policy. The `migration` target keeps Prisma CLI/TSX available only for an explicit release command. The image build supplies a synthetic, loopback-only URL for `prisma generate`; it is not used by the running service. Database migration is never run automatically at startup. `npm ci --omit=dev` alone is not the release procedure: the migration stage needs Prisma CLI, while the runtime image is pruned to production dependencies after the client is generated.

For Vercel, set the project root to `frontend`, install from `frontend/package-lock.json`, build with `npm run build`, and set the public build-time variable `VITE_API_BASE_URL` to the verified HTTPS API origin. Keep `VITE_RFID_BRIDGE_ENABLED=false`. `frontend/vercel.json` is the selected header configuration; `frontend/public/_headers` has been removed. Its CSP currently names the proposed `https://api.eduassets.tech`; update it to the actual API origin before deployment. A local JSON parse does not prove Vercel applied these headers.

## Nginx, trusted proxy and TLS

Review `deploy/nginx/eduassets-api.conf.example`, replace the proposed host and certificate paths with verified values, and install only after creating the Cloudflare real-IP include. The template forwards only `/` to the API; it does **not** enable WebSocket upgrades. It sets `X-Forwarded-For` to Nginx's sanitized `$remote_addr`, not to an arbitrary client-supplied chain, and uses modest body/read/send timeouts. Run `nginx -t` and reload only after an operator review. `TRUST_PROXY=1` means exactly one proxy hop; never set it to `true` or trust unvalidated forwarded headers. Without correctly maintained Cloudflare ranges, Express sees the edge address and rate limits may group many clients; this production IP/rate-limit behavior remains an external verification gate.

The backend defaults to loopback for direct non-production service use; the container deliberately binds inside its isolated network while Docker publishes only loopback. Public RFID remains off (`RFID_BRIDGE_ENABLED=false` and `VITE_RFID_BRIDGE_ENABLED=false`); no `/ws` proxy route is configured. Do not put the RFID kiosk on the public API instance.

## Health, logs and monitoring

- `GET /health` is liveness and intentionally does not depend on PostgreSQL.
- `GET /ready` executes a bounded `SELECT 1`; it returns only `{status:"ready"}` or HTTP 503 `{status:"unavailable"}`.
- Docker health checks `/ready`. Configure independent external uptime checks and alerts for HTTPS `/health` and `/ready`, HTTP 5xx, disk space, PostgreSQL availability, certificate expiry, backup failure, and CPU/memory pressure. A successful repository test does not configure monitoring.
- Logs go to stdout/stderr; inspect with `docker compose ... logs --since=1h api`. Do not log bearer tokens, RFID token contents, bridge secrets or raw personal data.

## Backup, retention and recovery

Run `deploy/scripts/backup-postgres.sh` using a protected environment file or secret manager; the output is custom-format `pg_dump`, mode 0600. Store backups encrypted and off the VM, separate from the live DB credentials. A recommended starting retention policy is 30 daily and 12 monthly recovery points, adjusted to an approved RPO/RTO and applicable privacy retention policy. The script intentionally does not delete old backups; implement retention in the approved backup storage system and alert on failed/missing jobs.

For a restore drill, create a **new, empty, disposable** database, then run:

```bash
DATABASE_URL='postgresql://...new-empty-test-db...' \
BACKUP_FILE='./backups/eduassets-YYYYMMDDTHHMMSSZ.dump' \
RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE \
./deploy/scripts/restore-postgres-empty-db.sh
```

The script rejects a non-empty public schema and never uses `pg_restore --clean`. Verify the restored schema and a small synthetic smoke test. Do not restore over production as a rollback shortcut.

## Release and rollback

Before release: verify backups and restore evidence; build/tag immutable images; run CI; inspect migration SQL; apply migrations as an explicit release step; deploy one API instance; check `/health`, `/ready`, CORS, login, Guest response allowlists and core workflows; then deploy the Vercel build with the same API origin. Keep the prior image tag for code rollback.

A Git/image rollback does **not** reverse a database migration. Use backward-compatible expand/migrate/contract changes. If a migration is not backward-compatible, restore only under an approved incident plan after evaluating data loss; do not run rollback SQL blindly. The first production migration, database backup policy, TLS, origin firewall, Vercel settings and monitoring all remain unverified external tasks.

## Troubleshooting

- Startup fails: check required `JWT_SECRET`, `DATABASE_URL`, explicit `TRUST_PROXY`, `CORS_ORIGIN`, correct `PORT`, and that `RFID_BRIDGE_ENABLED` is false on public deployment. Error messages should not reveal secret values.
- `/health` works but `/ready` returns 503: inspect PostgreSQL reachability and credentials privately; the endpoint intentionally hides details.
- Browser CORS/CSP error: verify the Vercel build URL, Vercel CSP `connect-src`, exact backend CORS origin, DNS/TLS, and reverse-proxy headers. Do not broaden CSP to `*`.
- Rate limits group clients: verify Nginx real-IP configuration is sourced only from current Cloudflare ranges, forwarding headers are overwritten, and `TRUST_PROXY=1` matches the single local Nginx hop.
- RFID endpoints are unavailable on public deployments by design.
