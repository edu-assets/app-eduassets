# Deployment and operations (English)

> **Historical record (October 23, 2026):** the operator validated the Cloudflare Pages frontend at `app.eduassets.tech`, Nginx API at `api.eduassets.tech`, Neon configuration, external HTTPS, and CORS preflight. On October 28, 2026, the operator also recorded one manual encrypted R2 backup, the audit migration, and successful `/health` and `/ready` responses; details and limits are documented in the v1.0.1 release record below. These records are dated and are not continuous monitoring.

## Selected topology

The reference topology is a static frontend on Cloudflare Pages and one backend Docker service on a dedicated VM behind host Nginx and Cloudflare Full (strict). PostgreSQL is external and dedicated to this deployment. The `api` service uses port 3000 inside the Docker network; the VM publishes the API on loopback port 3000 only. RFID is disabled on the public instance. Do not connect a demo to operational data.

```text
Browser → Cloudflare Pages static frontend → Cloudflare HTTPS → Nginx :443
                                                   → 127.0.0.1:3000 Docker API → PostgreSQL
```

### Prerequisites (operator actions)

1. Choose verified frontend/API DNS names and provision a dedicated PostgreSQL database/user with least privilege, automated provider backups, and a tested restore destination. Do not share credentials or databases with a school kiosk or public demo. For managed PostgreSQL, use the provider hostname and CA bundle and follow the provider/client-specific TLS parameters. `sslmode=verify-full` is a libpq setting for `pg_dump`/`psql`; do not copy it into a Prisma URL unless the installed Prisma version accepts it. Keep a separate libpq backup/restore URL when Prisma and PostgreSQL tools require different query parameters, and never disable TLS verification in production. [PostgreSQL SSL documentation](https://www.postgresql.org/docs/current/libpq-ssl.html)
2. Provision the VM, Docker Engine/Compose, Nginx, PostgreSQL client tools, and a non-root deployment account. In Oracle Cloud NSG/Security Lists and the host firewall, expose only HTTPS (preferably Cloudflare source ranges only) and explicitly managed SSH. Do not expose 3000, 3001, or PostgreSQL publicly.
3. Obtain origin TLS for the actual API hostname. In Cloudflare, set **Full (strict)**. Never commit a private key. Verify certificate subject, chain, validity dates and hostname before loading it into Nginx; establish renewal and expiry alerts.
4. Copy `.env.production.example` to `.env.production` with mode `0600`; set the verified origin, allowlist, strong external `JWT_SECRET`, dedicated DB URL, and one-time `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` for the initial seed. Never add production secrets to Git, frontend variables, build args, or Docker layers. `DIRECT_URL` may be omitted; Prisma config falls back to `DATABASE_URL`.
5. Review `deploy/nginx/eduassets-cloudflare-realip.conf.example`, which records ranges from Cloudflare's official sources retrieved on 2026-10-22. Re-check the official list immediately before deployment and periodically, then install the current ranges in `/etc/nginx/snippets/eduassets-cloudflare-realip.conf`, one `set_real_ip_from` per range. Trust `CF-Connecting-IP` only for verified Cloudflare peers. Also restrict the origin at cloud and host firewalls.

## Build, migration, and start

The backend lives in the separate [`edu-assets/api-eduassets`](https://github.com/edu-assets/api-eduassets) repository. The recorded production checkout was `/opt/api-eduassets` and the Compose project was `eduassets`. Use a reviewed release commit, not an unknown local change. After approving the commit and CI:

```bash
cd /opt/api-eduassets
git fetch origin main
git switch main
git pull --ff-only origin main
git rev-parse --short=12 HEAD
chmod 600 .env.production
export EDUASSETS_IMAGE_TAG="$(git rev-parse --short=12 HEAD)"
docker compose -p eduassets --env-file .env.production -f docker-compose.production.yml config --quiet
docker compose -p eduassets --env-file .env.production -f docker-compose.production.yml build --pull api migrate
```

Confirm an encrypted backup before migration. Use a libpq-compatible **Direct** URL without a password; for PostgreSQL 18, use `pg_dump` major version 18 or newer. Store the password in `/etc/eduassets/pgpass` (mode `0600`) and use only the public `age` recipient on the VM; keep its private identity off the VM. Example environment, with no real credentials:

```bash
export DATABASE_URL='postgresql://USER@DIRECT_HOST:5432/DATABASE?sslmode=require&channel_binding=require'
export PGPASSFILE='/etc/eduassets/pgpass'
export AGE_RECIPIENT="$(< /etc/eduassets/age-recipient.txt)"
export RCLONE_DESTINATION='offsite:<bucket>/postgres'
export BACKUP_DIR='/var/backups/eduassets'
export PATH="/usr/lib/postgresql/18/bin:$PATH"
./deploy/scripts/backup-postgres.sh
ls -lh "$BACKUP_DIR"/*.dump.age
rclone ls "$RCLONE_DESTINATION"
```

Stop the release if the script fails or the new object is absent from offsite storage. Listing proves transfer, not restore. This repository does not schedule backups or implement automatic retention.

Run the migration as an explicit step and recreate only the API service:

```bash
docker compose -p eduassets --env-file .env.production -f docker-compose.production.yml --profile release run --rm --no-deps migrate
docker compose -p eduassets --env-file .env.production -f docker-compose.production.yml up -d --no-build --force-recreate api
docker compose -p eduassets --env-file .env.production -f docker-compose.production.yml ps
docker compose -p eduassets --env-file .env.production -f docker-compose.production.yml logs --since=10m --tail=100 api
curl --fail --show-error http://127.0.0.1:3000/health
curl --fail --show-error http://127.0.0.1:3000/ready
curl --fail --show-error https://api.eduassets.tech/health
curl --fail --show-error https://api.eduassets.tech/ready
```

Do not run `seed` during routine updates. The `seed` service is only for reviewed initial provisioning, with the correct database and temporary `SEED_*` values. `20261028173000_user_management_audit` creates the user-management/audit schema and must be applied before starting the corresponding API.

The multi-stage image keeps only production dependencies in runtime, runs without privilege, drops Linux capabilities, uses a read-only root filesystem, and has a restart policy. The migration target keeps Prisma CLI/TSX for the explicit release step. Prisma Client generation uses a synthetic local URL only during build; migrations never run automatically at startup.

For Cloudflare Pages, use root `/`, `npm run build`, and output `dist`; set `VITE_API_BASE_URL=https://api.eduassets.tech` and `VITE_RFID_BRIDGE_ENABLED=false`. There is no `VITE_DOCS_BASE_URL`. The frontend fetches Markdown from an immutable commit pinned in `src/core/docs/docsService.ts` via `raw.githubusercontent.com`; use the bundled fallback only if the request fails. Set `CORS_ORIGIN=https://app.eduassets.tech`, with no trailing slash. CSP must allow the API, `https://raw.githubusercontent.com`, and the official Cloudflare Analytics beacon. CI validates code/templates but does not deploy Pages or the VM.

## Production release record — October 28, 2026

The operator confirmed the API update from `edu-assets/api-eduassets`, commit `14b0716110750857daa27d0e979e3bec574e39e0`. The `eduassets-backend` and `eduassets-backend-migration` images were built with short tag `14b071611075`; migration `20261028173000_user_management_audit` was applied and the `api` service was recreated without rebuilding. `/health` and `/ready` returned the expected states through VM loopback and `https://api.eduassets.tech`. The first `docker compose ps` snapshot was during `health: starting`; no later `healthy` snapshot was recorded.

Before migration, the operator created `eduassets-20261028T223140Z.dump.age` with `pg_dump` 18.6 against Neon 18.6 using a password-free Direct URL and mode-0600 `PGPASSFILE`; `age` encrypted the dump and `rclone` transferred the ciphertext to Cloudflare R2 bucket `eduassets-postgres-backups`. The 328366-byte object was listed in R2. The first `PUT` returned HTTP 501, but the next automatic retry completed the transfer. A local disposable restore is recorded separately in the API runbook; **this production object was not restored**. This deployment did not configure backup scheduling/retention or change Nginx/firewall/Cloudflare settings.

## Nginx, trusted proxy and TLS

Review `deploy/nginx/eduassets-api.conf.example`, replace the proposed hostname and certificate paths with verified values, and install only after creating a Cloudflare real-IP include with current official ranges. The include must trust only those ranges; the template overwrites `X-Forwarded-For` with Nginx’s sanitized address rather than a client-supplied chain. Client-IP attribution in Nginx/Express and rate limits depend on the proxy chain and current trusted ranges; missing or stale ranges may prevent correct attribution. Validate the chain on the host before considering the configuration complete. The template blocks `/auth/rfid` and `/ws/rfid` and does not enable WebSocket upgrades. Run `nginx -t` and reload only after operator review.

The backend defaults to loopback for direct non-production service use; the container deliberately binds inside its isolated network while Docker publishes only loopback. Public RFID remains off (`RFID_BRIDGE_ENABLED=false` and `VITE_RFID_BRIDGE_ENABLED=false`); no `/ws` proxy route is configured. Do not put the RFID kiosk on the public API instance.


- For public deployments, add a reviewed Cloudflare WAF/rate-limiting rule for `POST /auth/login` in addition to the application limiter. This external setting is not created or verified by this repository.

## Health, logs and monitoring

- `GET /health` is liveness and intentionally does not depend on PostgreSQL.
- `GET /ready` executes a bounded `SELECT 1`; it returns only `{status:"ready"}` or HTTP 503 `{status:"unavailable"}`.
- Docker health-checks `/ready`; PostgreSQL unavailability may mark the container `unhealthy`. `restart: unless-stopped` does not restart a container solely because it is `unhealthy`; monitor and alert on that state separately.
- Logs go to stdout/stderr and Docker rotation is capped at 10 MB × 5 files per container; inspect with `docker compose ... logs --since=1h api`. Do not log bearer tokens, RFID token contents, bridge secrets or raw personal data.

## Backup, retention and recovery

From the backend repository checkout, run [`deploy/scripts/backup-postgres.sh`](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/backup-postgres.sh) using a protected environment file or secret manager; the output is custom-format `pg_dump`, mode 0600. Schedule it through the approved host/backup service; the backend repository does not install a schedule. Store backups encrypted and off the VM, separate from the live DB credentials. A recommended starting retention policy is 30 daily and 12 monthly recovery points, adjusted to an approved RPO/RTO and applicable privacy retention policy. The script intentionally does not delete old backups; implement retention in the approved backup storage system and alert on failed/missing jobs.

For a restore drill, create a **new, empty, disposable** database. From the same backend checkout, review [`deploy/scripts/restore-postgres-empty-db.sh`](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/restore-postgres-empty-db.sh), then run:

```bash
DATABASE_URL='postgresql://...new-empty-test-db...' \
BACKUP_FILE='./backups/eduassets-YYYYMMDDTHHMMSSZ.dump' \
RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE \
./deploy/scripts/restore-postgres-empty-db.sh
```

The script refuses pre-existing objects in any non-system schema and never uses `pg_restore --clean`. Verify the restored schema and run a synthetic smoke test. Do not restore over production as a rollback shortcut.

## Release and rollback

Before release: verify backups and restore evidence; build/tag immutable images and set `EDUASSETS_IMAGE_TAG` explicitly, recording the previous tag; run CI; inspect migration SQL; apply it as an explicit release step; deploy one API instance; check `/health`, `/ready`, CORS, login, Guest response allowlists, and core workflows; then publish the Cloudflare Pages build manually. Current CI workflows validate code and smoke tests but do not publish/deploy automatically.

A Git/image rollback does **not** reverse a database migration. Use backward-compatible expand/migrate/contract changes. If a migration is not backward-compatible, restore only under an approved incident plan after evaluating data loss; do not run rollback SQL blindly. The first production migration, database backup policy, TLS, origin firewall, Cloudflare Pages settings and monitoring all remain unverified external tasks.

## Troubleshooting

- Startup fails: check required `JWT_SECRET`, `DATABASE_URL`, explicit `TRUST_PROXY`, `CORS_ORIGIN`, correct `PORT`, and that `RFID_BRIDGE_ENABLED` is false on public deployment. Error messages should not reveal secret values.
- `/health` works but `/ready` returns 503: inspect PostgreSQL reachability and credentials privately; the endpoint intentionally hides details.
- Browser CORS/CSP error: verify the Cloudflare Pages custom domain, `_headers` CSP `connect-src`, exact backend CORS origin, DNS/TLS, and reverse-proxy headers. Do not broaden CSP to `*`.
- Rate limits group clients: verify Nginx real-IP configuration is sourced only from current Cloudflare ranges, forwarding headers are overwritten, and `TRUST_PROXY=1` matches the single local Nginx hop.
- RFID endpoints are unavailable on public deployments by design.
