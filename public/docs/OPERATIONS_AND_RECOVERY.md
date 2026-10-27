# Operations and recovery — eduAssets

This guide supports incident triage; it does not replace the [Deployment Guide](DEPLOYMENT.md) or [Hosting Guide](Hosting.md). It is written for authorized operators. It contains no credentials, personal data, or direct commands for modifying a production database.

## Known limitations

- The GitHub Actions workflow runs checks and smoke tests against disposable infrastructure; it does **not** publish the frontend or deploy/restart the Oracle VM.
- Run `39875293195` is historical evidence recorded for `verify` and `production-smoke` on commit `a8cd39b`, not proof of the current checkout or remote service state.
- Releases that change the schema require a confirmed backup, an explicit migration, and health/readiness validation; do not seed or migrate an operational database without review and an approved maintenance window.
- Session revocation requires an API request. If the network is unavailable when a user logs out, the UI clears local state but cannot confirm server-side revocation.
- Administrator inactivity timeout is 30 minutes; activity is process-local and assumes a single instance. After restart, administrative tokens without recoverable activity state fail closed; JWTs expire within 8 hours.
- RFID is optional, depends on hardware and configuration, and is disabled/blocked at the public edge in the reference deployment templates.

## Initial triage

1. Record the time, version/commit and symptoms without including passwords, cookies, JWTs, RFID codes, or student data.
2. Separate browser/frontend, API, database, proxy/TLS, network, and hardware failures. Compare `/health` (process liveness) with `/ready` (PostgreSQL dependency); liveness alone does not prove the database is healthy.
3. Review sanitized service, Nginx, and CI logs. Redact environment values and authentication headers before sharing output.
4. Do not work around CORS by removing Origin validation, expose ports 3000/3001/5432 to the Internet, or enable RFID as an emergency login path.
5. For availability, configuration, backup, migrations, and rollback, follow the reviewed sequence in the hosting/deployment guides. Stop if database state or backup integrity cannot be confirmed.

## Suspected account compromise

The user should end the session and notify the installation administrator through an institutional channel. The administrator should review the account and available events, revoke/rebind credentials using approved access procedures, review subsequent sessions, and assess possible data exposure. Password changes require an authenticated session; self-service recovery is not implemented. An emergency manual reset must follow the reviewed administrative runbook and be performed by an authorized operator—not improvised with SQL.

Never ask users to send passwords, cookies, JWTs, RFID one-time codes, or database dumps. If an infrastructure secret may have leaked, follow the organization's rotation process and record the change without copying the new value into tickets or Git.

## Restore and service recovery

Backups and migrations are high-impact operations. In a backend repository checkout, [backup-postgres.sh](https://github.com/edu-assets/eduAssets/blob/main/deploy/scripts/backup-postgres.sh) creates a custom-format `pg_dump`; [restore-postgres-empty-db.sh](https://github.com/edu-assets/eduAssets/blob/main/deploy/scripts/restore-postgres-empty-db.sh) requires confirmation and accepts only a disposable destination with no objects in non-system schemas, without `--clean`. Follow the [deployment and restore procedure](DEPLOYMENT.md), test against an isolated destination, verify integrity/counts without exposing data, and obtain authorization before changing production. This document does not prove a live restore or establish retention/RPO/RTO.

After an authorized intervention, record the version, applied migrations, `/health` and `/ready` results, responsible operator, and residual risks. Do not close an incident merely because a container started: validate login, an appropriate read-only request, clean logs, and backup availability.

## Related documentation

- [Hosting Guide](Hosting.md) / [Guia de Hospedagem](Hospedagem.md)
- [Deployment Guide](DEPLOYMENT.md) / [Guia de Implantação](GUIA_IMPLANTACAO.md)
- [API Reference](API_REFERENCE.md) / [Referência da API](REFERENCIA_API.md)
- [Data Model](DATA_MODEL.md) / [Modelo de Dados](MODELO_DE_DADOS.md)
- Administrative runbook for authorized operators: `operations/backend/ADMIN_PASSWORD_RESET_RUNBOOK.md` (not served under `public/docs/`; GitHub visibility depends on this repository's access settings).
