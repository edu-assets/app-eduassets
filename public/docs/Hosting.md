# EduAssets hosting and operations

> **Status:** Beta, with the operator-validated deployment completed on October 23, 2026. The validation covered the Oracle VM API, the Nginx HTTPS proxy, proxied Cloudflare DNS, the Cloudflare Pages frontend, and the CORS preflight. Off-host backups, a restore drill, monitoring, and the final security review for real data remain separate operational tasks.

## 1. Deployed topology

The deployment uses three distinct hostnames:

- `eduassets.tech`: an independent landing page hosted by another Cloudflare project;
- `app.eduassets.tech`: the static EduAssets frontend hosted on Cloudflare Pages;
- `api.eduassets.tech`: the Node.js/Express backend running in Docker on an Oracle Cloud Ubuntu VM.

PostgreSQL remains remote on Neon. The VM has only 1 GB of RAM, so it does not host the database locally.

```text
Browser
  ├─ https://eduassets.tech       → Cloudflare landing page
  └─ https://app.eduassets.tech   → Cloudflare Pages
                                      │ HTTPS/API
                                      ▼
                            https://api.eduassets.tech
                                      │ Cloudflare proxy
                                      ▼
                         Oracle Cloud VM / Nginx :443
                                      │ local proxy
                                      ▼
                      Docker API on 127.0.0.1:3000
                                      │ PostgreSQL TLS
                                      ▼
                                  Neon
```

Port `3000` must not be exposed to the Internet. Docker publishes the API only on `127.0.0.1:3000`; Nginx is the VM's public service.

## 2. Prerequisites

The VM requires Ubuntu, Docker Engine with Docker Compose, Nginx, UFW, and administrative SSH access. Cloudflare requires the `eduassets.tech` zone, the frontend Pages project, and the API DNS record.

Use a protected environment file on the VM:

```bash
cd /opt/eduassets
chmod 600 .env.production
```

The essential production values are:

```env
NODE_ENV=production
DATABASE_URL=<Neon URL, never document the real value>
JWT_SECRET=<strong secret, VM only>
CORS_ORIGIN=https://app.eduassets.tech
TRUST_PROXY=1
RFID_BRIDGE_ENABLED=false
```

`CORS_ORIGIN` must exactly match the frontend origin, without a trailing slash. Never copy `DATABASE_URL`, `JWT_SECRET`, passwords, tokens, or keys into Git, documentation, or `VITE_*` variables.

## 3. Cloudflare Pages configuration

In the frontend Pages project:

1. Repository: `edu-assets/eduAssets`.
2. Production branch: `main`.
3. Root directory: `frontend`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Public build-time variables:

```env
VITE_API_BASE_URL=https://api.eduassets.tech
VITE_RFID_BRIDGE_ENABLED=false
```

7. Custom domain: `app.eduassets.tech`.

`frontend/public/_headers` is copied to `dist/_headers`. The CSP allows the API and the official Cloudflare Web Analytics beacon:

```text
script-src 'self' https://static.cloudflareinsights.com
connect-src 'self' https://api.eduassets.tech https://cloudflareinsights.com
```

The Analytics beacon was blocked when the policy contained only `script-src 'self'`. After changing `_headers`, wait for a new Pages deployment and perform a hard refresh in the browser.

## 4. DNS and TLS

The canonical API record is:

```text
Type: A
Name: api
Content: <current public IP of the Oracle VM>
Proxy status: Proxied
```

During the validated deployment, the VM public IP was `137.131.185.105`. If the IP changes, update DNS and do not document the new value together with secrets.

Keep one record for `api.eduassets.tech`; remove duplicate records for the same hostname. `app` and the apex domain may continue to point to their respective Cloudflare projects.

Use **Full (strict)** in Cloudflare when the matching origin certificate for `api.eduassets.tech` is installed in Nginx. Never publish the private certificate key.

## 5. Start and update the API

The production API is managed by Compose, not by `npm run dev`:

```bash
cd /opt/eduassets

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  ps
```

Start a stopped container:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d api
```

After `git pull` or a code change:

```bash
git pull --ff-only origin main

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d --build --force-recreate api
```

After changing only `.env.production`, recreation is still required:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d --force-recreate api
```

Confirm that the container received the correct origin:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  exec api printenv CORS_ORIGIN
```

Expected output:

```text
https://app.eduassets.tech
```

Migrations and seeding are explicit operations. Never seed an unknown or production database without a backup and review. The API must not run migrations automatically at startup.

## 6. Nginx

Nginx receives HTTPS on `0.0.0.0:443` and forwards to the local API. Validate before reloading:

```bash
sudo nginx -t
sudo ss -ltnp | grep -E ':(80|443)\b' || true
sudo systemctl status nginx --no-pager
```

Test locally without going through Cloudflare:

```bash
curl -vk --max-time 10 \
  --resolve api.eduassets.tech:443:127.0.0.1 \
  https://api.eduassets.tech/health
```

The public configuration keeps RFID disabled. `/auth/rfid` and `/ws/rfid` must remain blocked in both Nginx and the backend. The RFID kiosk is a separate local deployment.

## 7. Firewall: incident and fix

During deployment, SYN packets reached the VM interface but the external client timed out. The API on `127.0.0.1:3000` and local Nginx returned `200`. The cause was the iptables `INPUT` chain:

```text
Chain INPUT (policy DROP)
...
REJECT all ... reject-with icmp-host-prohibited
ufw-before-input ...
```

The generic `REJECT` appeared before the UFW chains, so `ufw allow 80/tcp` and `ufw allow 443/tcp` were never reached. The safe fix was to allow only new TCP connections on the public ports before the block:

```bash
sudo iptables -I INPUT 5 -p tcp --dport 80 \
  -m conntrack --ctstate NEW -j ACCEPT

sudo iptables -I INPUT 5 -p tcp --dport 443 \
  -m conntrack --ctstate NEW -j ACCEPT
```

Do not remove the generic `REJECT`, open port `3000`, or change `FORWARD` without evidence that Docker forwarding is blocked. Confirm the order:

```bash
sudo iptables -L INPUT -n -v --line-numbers
```

The port 80/443 rules must be above the `REJECT`. Persist only after validating access:

```bash
if command -v netfilter-persistent >/dev/null 2>&1; then
  sudo netfilter-persistent save
else
  sudo mkdir -p /etc/iptables
  sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
fi
```

In addition to the host firewall, the Oracle VCN/NSG or Security List must allow TCP 80 and 443 according to the chosen origin policy. SSH must remain restricted to the administrative IP. Do not allow port 3000 or PostgreSQL.

## 8. Layered diagnosis

Check the container first:

```bash
curl -i --max-time 10 http://127.0.0.1:3000/health
```

Then local Nginx:

```bash
curl -vk --max-time 10 \
  --resolve api.eduassets.tech:443:127.0.0.1 \
  https://api.eduassets.tech/health
```

Then, from an external computer, force the VM IP:

```powershell
curl.exe -vk --max-time 15 `
  --resolve api.eduassets.tech:443:<VM-PUBLIC-IP> `
  https://api.eduassets.tech/health
```

Interpretation:

- Failure on `127.0.0.1:3000`: container/API or the database path used by `/ready`.
- Local Nginx works but the external test times out: firewall, NSG/Security List, route, or public IP.
- `522`/`523`: Cloudflare cannot reach the origin; this is not yet a CORS error.
- `204` without `Access-Control-Allow-Origin`: preflight/CORS is still incorrect.
- `204` with the exact origin: the CORS preflight is correct.

To observe whether external traffic reaches the VM:

```bash
sudo tcpdump -ni any 'tcp port 443'
```

## 9. CORS validation

Once HTTPS is reachable, run from PowerShell:

```powershell
curl.exe -i -X OPTIONS https://api.eduassets.tech/ready `
  -H "Origin: https://app.eduassets.tech" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: authorization,content-type"
```

The validated deployment returned `204 No Content` and included:

```http
access-control-allow-origin: https://app.eduassets.tech
access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE
access-control-allow-headers: authorization,content-type
```

This proves the preflight; login and business workflows must still be tested in the UI with an authorized account.

## 10. Health, logs, and continuous operation

```bash
curl -i https://api.eduassets.tech/health
curl -i https://api.eduassets.tech/ready

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  logs --tail=100 api
```

`/health` is liveness and does not depend on PostgreSQL. `/ready` checks the Neon connection and may return `503` when the database is unavailable. The container uses `restart: unless-stopped`, so it remains active across a Docker daemon restart as long as the Compose service and restart policy are preserved.

Configure external monitoring separately for `/health`, `/ready`, 5xx responses, TLS expiry, disk space, memory, Neon availability, and backup failures. The repository does not create this monitoring automatically.

## 11. Backup and recovery

Before migrations on an operational database, run `deploy/scripts/backup-postgres.sh` with a protected URL compatible with `pg_dump`. For Neon PostgreSQL 18, use `pg_dump` major version 18 or newer; do not use a version 16 client against a version 18 server.

When sourcing an environment file, avoid externally duplicated quote characters. For `pg_dump`, keep a dedicated libpq URL if Prisma parameters differ. Never place real URLs in this document.

Backups must be encrypted, copied off the VM, and tested by restoring into a new empty database. An existing dump file alone does not prove recoverability.

## 12. Post-deployment checklist

- [x] Frontend at `app.eduassets.tech`.
- [x] Separate landing page at `eduassets.tech`.
- [x] API at `api.eduassets.tech`.
- [x] Remote PostgreSQL on Neon.
- [x] Docker API published locally on the VM.
- [x] Nginx listening on 80/443.
- [x] Port 80/443 input rules fixed before the generic `REJECT`.
- [x] External HTTPS reaches the API.
- [x] CORS preflight returns the exact frontend origin.
- [x] CSP allows the API and official Cloudflare beacon.
- [ ] Off-host backup and restore drill documented with operational evidence.
- [ ] External monitoring and alerts configured.
- [ ] Final privacy, database grants, and retention review for real data.

The product remains **Beta** until the operational items and complete functional QA are finished.
