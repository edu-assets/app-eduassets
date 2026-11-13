# Changelog — eduAssets

This changelog preserves dated development and deployment records. The current product version is **official 1.5.2**, released on November 13, 2026; earlier entries remain historical.

## v1.5.2 — Fixes for push notifications, on-screen notices, Records and cards — November 13, 2026

Correction release (app and API); the site only aligns the version number. All fixes apply on mobile and desktop.

- **Returns:** sorting is now a two-button control, **Oldest first** / **Newest first**, styled like the app (it used to be a plain browser select). On mobile, the search field takes the full width ("Search requester, equipment…").
- **Push notifications (activation):** on phones, if the browser permission prompt took a few seconds, it disappeared and errors such as "Registration failed - push service error" stacked on screen; even after allowing, the banner could only be dismissed with **Not now**; **Settings → Notifications** had the same problem. Now only one activation runs at a time (also across tabs and the installed app), a transient failure is retried once automatically, browser errors appear as clear translated messages (notification service unavailable, server key problem, permission prompt without an answer), if you allow the permission later the activation finishes on its own and the banner disappears, and subscriptions created with an old server key are replaced automatically.
- **API:** at startup the API checks that `VAPID_PUBLIC_KEY` is the public key of `VAPID_PRIVATE_KEY`; if they do not match, push is disabled and the log shows "VAPID_PUBLIC_KEY não corresponde a VAPID_PRIVATE_KEY." Fix: generate a new pair with `npx web-push generate-vapid-keys`, set both variables and restart the API. Existing device subscriptions must be re-activated by each administrator (the app does it automatically on its next open when the key changed; otherwise administrators may need to click **Turn on notifications** again).
- **On-screen notices (toasts):** identical messages are no longer stacked (a repeated message refreshes the one already shown), at most 3 messages are visible at once, and all of them close on their own, including errors (after 8 seconds), while keeping the close button and pausing on hover (briefly).
- **New loan:** added items are compact chips with the equipment icon and only the model name on one line (the category appears on hover and for screen readers), so they no longer overflow the form on phones.
- **Dashboard:** the equipment summary cards (**Total equipment**, **Available**, **On Loan**, **Maintenance**, **Broken**) no longer show the percentage "of total" text; on phones they are narrower, with **Total** on its own row and the other cards in a 2×2 grid. The **History** cards on phones and the **Control** cards were reorganized with a clearer hierarchy (title, status and details separated, like the **Stock** cards).
- **Records:** no more modal inside a modal. The **Records** window has a single scroll; **Edit**, **Adjust total**, **Rename**, **Reset password** and **RFID Card** open an edit view inside the same window, with **Back**, a title and the record name; **Cancel** and **Save** stay fixed at the bottom (above the phone keyboard). **Back**, **Cancel**, Esc or saving return to the list keeping the search and scroll position. On phones the window is full-screen and the **System Users** list no longer scrolls sideways.
- **Documentation:** User Manual §2, §4, §5, §6, §7, §8, §10, §11 and §15; Hosting §5.3 (VAPID keys).

## v1.5.1 — Clearer guest mode, stock alerts and dates in the selected language — November 13, 2026

Interface-only release; the API and the site only align the version number.

- **Guest mode:** a **Guest mode — read-only** banner with a **Sign in** button (can be dismissed for the session). Actions unavailable to guests are announced as unavailable, with the hint "Sign in to save changes."; the **New loan** panel shows this notice before the form.
- **Stock:** an **Out of stock** badge when no unit is available and **Low stock** when 10% or less of the total (at least 1 unit) is available.
- **New loan:** the **Requester** field suggests names already used (signed-in users only).
- **Language:** dates follow the selected language in lists, details, exports and PDF; the remaining fixed Portuguese texts were translated.
- **Accessibility:** decorative icons are hidden from screen readers.

## v1.5.0 — Filtered history, per-panel routes and a safer session — November 13, 2026

- **Navigation:** each panel has its own address (`#app/<panel>`, for example `#app/devolucoes` and `#app/dashboard/historico`). Reloading keeps the panel, the browser back and forward buttons work and the tab title shows the panel. Administrator-only panels redirect users without access.
- **Session:** a warning appears 2 minutes before an administrator session expires from inactivity (30 min), with a countdown and the **Stay signed in** and **Sign out now** buttons. Activity in one tab counts for all tabs, and while an administrator is active the app confirms activity with the server at most once per minute. After expiry and a new login the user returns to the previous panel; an explicit logout takes the next user to **Home** and signs out other tabs. Editors can turn on an optional inactivity timeout in **Settings → Session** (off by default; 15, 30 or 60 min; this browser only).
- **Dashboard → History:** loads 50 loans at a time, with **Load more** and **Showing N loans** (guests too; the silent 50-item limit is gone). Status chips (**All**, **Open**, **Returned**), period chips (**Today**, **7 days**, **This month**, **All time**), server-side search for signed-in users and **Clear filters**.
- **Export:** fetches every page of the period and filters by checkout date (`dataRetirada`); it used to filter locally by creation date.
- **Returns:** search (requester, responsible, equipment and registered by) and sorting (oldest or newest first). Empty states distinguish "no results for x" and offer **Clear search** and **Clear filters**.
- **Records:** rename categories; edit, deactivate and reactivate responsible parties (inactive ones disappear from the loan form); the new-user form blocks weak passwords.
- **Passwords:** fields have a show/hide button and a live requirement checklist (Security, administrator reset, recovery and new user); the Security form submits with Enter. When changing a password, the new one must meet the strong rule and differ from the current one.
- **Notifications (toasts):** announced to screen readers, errors stay until closed, close button, pause on hover and bottom-center position on mobile.
- **API:** `GET /emprestimos` gains `status`, `de`/`ate`, `q` and `paginado=1`; new `PATCH /categorias/:id` and `PATCH /responsaveis/:id`; `GET /responsaveis` returns only active ones by default; `POST /emprestimos` with an inactive responsible party returns `409`. Migration `20261114100000_loan_history_filters_responsavel_active` (`Responsavel.ativo` and index `Emprestimo(dataRetirada, id)`).
- **Documentation:** User Manual §2, §5, §6, §8, §9, §10 and §11; API Reference (loans, categories, responsible parties, password, notification target); Data Model (`Responsavel.ativo`, index, migration); Architecture (routes and session).

## v1.4.0 — Record authorship, user management and interface refinements — November 13, 2026

- **Record authorship:** loans, occurrences, equipment, categories and responsible parties now store who created, changed, returned or resolved them. Migration `20261113150000_record_authorship` is additive and backfills existing records from the audit log; records without audit rows have no author. Signed-in users (Administrator or Editor) see authorship in Returns, Dashboard (History and stock details), Control and Records; Guests never receive this data. CSV, Excel and PDF exports gain **Registered by** and **Returned by** (loans) and **Created by** (occurrences) when signed in.
- **Records → Users:** edit name, access level and login, deactivate and reactivate (with confirmation), an **Inactive** badge and a warning for logins that are not valid emails. New logins and login changes must be emails. The API prevents deactivating or demoting yourself and removing the last active administrator.
- **Records:** **Adjust total** for equipment (cannot go below items in use), list search and inline field errors.
- **Settings:** the **Save Settings** button was removed (it saved nothing); theme and language apply immediately and are saved in this browser.
- **Control:** non-functional pagination removed, **Learn more** opens the manual, required-field validation, double-click protection on save, resolve and delete, and keyboard-accessible tabs and menus (arrows, Home/End, Esc).
- **New loan:** equipment options show "(N available)", unavailable models are disabled, quantity is limited with an inline error, and the note has a 0/250 counter.
- **Returns:** **Details** button on each card, keyboard accessible.
- **Loading and errors:** loading skeletons and "—" counters on first load; in-panel error with **Try again** on Dashboard, Returns and Control.
- **Security and profile:** **Last change** shows the date of the last password change (**No record** if none); the My Profile subtitle is neutral for Editors; Guests see "Sign in to record changes." when attempting a blocked action.
- **API:** `GET /auth/me` returns `senhaAlteradaEm`; authenticated responses include author objects `{ id, nome }`; guest `GET /categorias` returns `{ id, nome }`; new errors on `PATCH /usuarios/:id`.
- **Note:** password recovery only works if the login's mailbox really exists.
- **Documentation:** User Manual §2, §4, §5, §6, §7, §8, §9, §10, §11 and §12; API Reference (authorship, `/auth/me`, `/usuarios`); Data Model (authorship fields and migration).

## v1.3.0 — Notification banner, guided activation and single version source — November 13, 2026

Consolidates everything released since 1.2.0; details are in the dated entries below.

- **Push notifications for administrators:** system alerts for loans, returns and occurrences, enabled per device (see *Push notifications for administrators*).
- **Activation banner:** administrators who have not yet enabled notifications on the current device see a banner at the top of the app, with **Enable notifications** and **Not now** (hides the banner for 7 days on that device). On iPhone and iPad outside the installed app it explains how to install to the Home Screen; when notifications are blocked it shows how to unblock them.
- **Permission prompt not shown:** when the browser does not show the permission prompt (for example Chrome's quieter notification UI, which shows only a crossed-out bell in the address bar, or prompts dismissed several times), the app explains how to allow notifications through the icon next to the address (Notifications › Allow); the blocked message was improved the same way.
- **Automatic completion:** after the administrator allows notifications in the browser's site settings, the app finishes enabling them by itself, with no second click — only if they asked for them in that session or the banner was showing; a device is never subscribed silently.
- **Automatic refresh and date and time:** periodic data refresh, mobile form fixes, server clock and date validation.
- **Privacy and cookies:** app Privacy Policy, cookie consent and Google Analytics only after acceptance.
- **Recovery email:** new professional template and delivery through Brevo.
- **Operations:** active monitoring, dead-man-switch alerts, MFA and protections on the Cloudflare account, and the official `rclone` in backups.
- **Single version source:** the version shown in the app (About badge) comes from the app's `package.json` at build time. `npm run version:set -- <x.y.z> [--date YYYY-MM-DD]` updates the version in every repository (app, API, site, documentation READMEs and package files) and `npm run version:set -- --check` verifies they agree. The portfolio site also reads its version from its `package.json`.
- **Documentation:** User Manual §10 (banner, permission prompt and system notifications) and Development (new *Versioning*).

## Automatic refresh and date and time adjustments — November 12, 2026

Fixes and adjustments, with no version number.

- **Automatic refresh:** data refreshes by itself every 30 s while the screen is open, when you return to the app or tab and, for administrators, when a push notification arrives. Stock also refreshes after loans, returns and occurrences.
- **Mobile fix (loans):** after changing the date and time of a loan, the form could no longer be submitted (the "Enter a valid value..." message) until the page was reloaded; the same affected returns.
- **Mobile fix (menu):** the sidebar could not scroll down to the user profile.
- **Date and time:** automatic date and time fields follow the server clock; returns without a manually changed date use the server time.
- **Validation:** the server rejects dates more than 5 minutes in the future and returns earlier than the loan's checkout.
- **Notifications:** loan and return notifications now open the Dashboard (History tab) instead of Control.
- **Session:** automatic refreshes do not keep an idle administrator session alive.
- **Documentation:** User Manual §3, §4, §5 and §10; API Reference (new *Data synchronization* section, `POST /emprestimos` and `PATCH /emprestimos/:id/devolver`).

## Push notifications for administrators — November 12, 2026

New feature, with no version number.

- **System alerts:** when another user registers a loan, a return or an occurrence, active administrators receive a notification on the computer or phone, even with the app closed or the phone locked. Activation is per device under **Settings → Notifications**, with switches per event type and the in-app sound. Editor accounts do not receive them.
- **Privacy:** the notification shows only the requester (or the occurrence type), the equipment by category and model, and who registered it; it never shows notes, descriptions, problem text, measures taken or patrimony numbers. Push services (Google, Apple, Mozilla and Microsoft) see only the device endpoint and an encrypted payload.
- **Operations:** new optional variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` in `.env.production`; without them the feature stays disabled and the API works normally. New `PushSubscription` table (migration `20261113090000_push_subscriptions`). No Nginx or CSP change was needed.
- **Documentation:** Hosting §5.3 and §10; User Manual §2, §10, §14 and §15; API Reference (new *Push notifications* section); Data Model (`PushSubscription` entity and notification rules).

## Monitoring, alerting and Cloudflare account security — November 12, 2026

Operations only, with no code or version change.

- **Uptime running:** Cloudflare's Bot Fight Mode blocked GitHub's runners (HTTP 403); it was kept off and the workflow now runs green every 15 minutes.
- **Dead-man-switch alerts** (healthchecks.io) configured for the VM health check and the daily backup.
- **Cloudflare:** account MFA and AI Labyrinth enabled; `security.txt` also configured in the dashboard.
- **Database:** grants and RLS verified in Neon and recorded in the Data Model.
- **Backup:** the R2 HTTP 501 came from Ubuntu's `rclone` 1.60, with no data loss; with the official `rclone` 1.76.0 on the VM, uploads succeed on the first attempt.
- **Documentation:** Hosting §10, §11.2, §14 and §15; Data Model.

## App privacy policy, cookie consent and Google Analytics — November 12, 2026

- **App Privacy Policy** at `app.eduassets.tech/#privacidade` (PT/EN), based on the documented data and providers: controller, data processed, guest mode, LGPD legal bases, providers, retention, cookies and browser storage, security and data-subject rights. The entry screen now says "By continuing, you agree to the Terms of Use and acknowledge the Privacy Policy", and item 9 of the Terms of Use points to it.
- **Google Analytics with consent:** the `G-9LJ1MQRCEV` tag was in the app and website HTML, but the CSP blocked the script in the app and the configuration on the website, so no visit was recorded — and the website policies said there was no analytics. The app and website now show a cookie banner and load Google Analytics only after **Accept**, through a bundled module (no inline script); **Decline** deletes the `_ga*` cookies, and the choice can be changed under **Cookie preferences**. Google signals and ad personalization are off; the address sent never includes the password recovery link. The CSPs allow the Google Analytics domains and the app CI checks it.
- **Website:** privacy and cookie policies rewritten (PT/EN) to declare Google Analytics with consent, local storage and the link to the app policy; **Cookie preferences** button in the footer.
- **Documentation:** Hosting §3 (CSP) and new §16 (privacy and cookies), User Manual.

## Professional recovery email and Brevo delivery — November 12, 2026

API update after the 1.2.0 release, with no version or database change.

- **New recovery email template** (API commit `5167d9f`): responsive PT/EN HTML with the brand banner embedded (inline attachment, no external images), a **Set a new password** button with the full link spelled out, a box with the account, request date/time (Brasília time) and validity, next steps, a "Didn't request this?" notice and a footer linking to the app, the website and support. The plain-text version mirrors the HTML.
- **New optional variables:** `SUPPORT_EMAIL` (footer contact and Reply-To, so replies do not land in `nao-responda@`) and `PUBLIC_SITE_URL` (website link). Both are validated at startup.
- **Delivery through Brevo:** Zoho Mail's free plan has no SMTP, so production now sends through `smtp-relay.brevo.com:587` with the `eduassets.tech` domain authenticated (DKIM `brevo1`/`brevo2`), the branded subdomain `em` and the VM IP on the authorized-IP list. Zoho still receives the domain's mail. DMARC was consolidated into a single record.
- **Documentation:** Hosting §5.2 rewritten for Brevo (including the correct command to recreate the API with the image tag), activation record in §14 and DMARC in §15; the User Manual describes the email received.

## v1.2.0 — Email password recovery, automatic deployment and alerts — November 12, 2026

- **Self-service password recovery:** a **Forgot my password** link on the entry screen. The API (`POST /auth/senha/recuperar`) always answers the same way, never revealing whether the account exists, and emails (SMTP; in production, Brevo with sender `nao-responda@eduassets.tech`) a single-use link valid for 30 minutes; the token travels in the URL fragment, is removed from the address bar when the app opens, and only its SHA-256 hash is stored (new `PasswordResetToken` table, migration `20261112130000_password_reset_tokens`). `POST /auth/senha/redefinir` applies the strong password policy, ends every session and audits `PASSWORD_RESET_SELF`. Limits: 10 requests per IP every 15 minutes and 3 per email per hour. Without SMTP configured, the feature stays hidden.
- **Automatic API deployment:** `eduassets-deploy.timer` on the VM deploys `main` once CI passes for the commit — with a backup before migrations, a health check and automatic code and image rollback. No ports are opened and no VM keys are stored in GitHub.
- **HTTP 5xx alerting:** the VM health check now reads the API request log and alerts when at least 5 HTTP 5xx responses account for 5% or more of the requests since the previous check; it also alerts when the last automatic deployment failed.
- **Automated documentation catalog:** `npm run docs:sync` in the app updates catalog dates and versions from the documentation repository's Git history, and the app CI fails when the catalog or the local document copy diverges from the pinned commit.
- **Dependencies:** fixed every vulnerability reported by `npm audit`. API: `body-parser` 2.4.0 (DoS through trailing bytes after a compressed body) and `deepmerge-ts` 8.0.2 in the Prisma CLI via `overrides`, without moving to Prisma 7. Site: `undici`, `zod`, `fast-xml-parser` and `fast-uri`. All four repositories now report 0 known vulnerabilities.
- **Documentation:** Hosting (§5.1 automatic deployment, §5.2 SMTP email, §10 5xx alerting), Deployment Guide, API Reference, User Manual and Operations and Recovery updated.

## v1.1.0 — Password reset, sessions and continuous operation — November 12, 2026

- **Administrator password reset:** in **Records → System Users**, the **Reset password** button sets a temporary password for another account through the existing `POST /usuarios/:id/password-reset` endpoint — same strong API policy, all of the account's sessions ended (`sessionVersion`) and a `PASSWORD_RESET` audit entry. For their own account, administrators are pointed to **Security**. The manual database reset runbook is now limited to the case where no administrator can sign in.
- **Offline logout:** when the API cannot confirm a logout, the browser marks it as pending, does not restore the session when the app is reopened and retries revocation once connectivity returns or on the next start. Previously the remaining `HttpOnly` cookie could restore the session on reload.
- **Monitoring:** `Uptime` GitHub Actions workflow (every 15 minutes) for `/health`, `/ready`, app, landing page, documentation, TLS validity and `security.txt`; systemd VM health check (disk, memory, container health with automatic restart after 3 consecutive failures, backup age), with optional dead-man-switch pings.
- **Backup:** daily systemd-scheduled run, retention of 7 days locally and 30 days in R2 with a safety lock (never deletes with fewer than 3 recent copies) and an automated restore drill into a disposable PostgreSQL on the operator machine (`verify-backup-restore.sh`).
- **Documentation:** User Manual, API Reference (adds `PATCH /usuarios/:id` and `POST /usuarios/:id/password-reset`), Hosting (new §11.1, §11.2, §14 and §15 with the Cloudflare zone security checklist) and Operations and Recovery updated; the production checkout path is unified as `/opt/api-eduassets`. An external check on November 12, 2026 recorded the API as healthy and connected to the database.
- **Items that depend on the operator:** enable the backup and health-check timers on the VM, run the first restore drill and apply the Cloudflare dashboard settings (DMARC, Bot Fight Mode, AI Labyrinth, MFA). Step-by-step instructions are in the Hosting Guide.

## v1.0.2 — Interface fixes — November 12, 2026

- Dashboard → Stock: each row now shows the equipment name (model) with its category below, removing seemingly duplicated rows when a category has more than one equipment item (for example, two tablet models). The column header is now "Equipment".
- Stock search also matches the equipment model; the detail panel shows the equipment alongside its category; the stock CSV export gained a `Modelo` column.
- Login: the entry card no longer has a fixed maximum height that hid content. On short viewports (laptops, 125–150% scaling) spacing is tightened so the whole form, including the support contact, stays visible; if height is still insufficient, the screen scrolls instead of clipping.
- The version badge in the About panel now shows the current version.

## v1.0.1 — Security and operations patch — October 28, 2026

- Frontend remediation: documentation sanitization now uses DOMPurify with restricted element/attribute/URL-scheme allowlists, remote images are removed, and regressions cover `javascript:` with CR/LF/TAB, `data:`, and `vbscript:` inputs; raw identifiers are protected.
- Browser authentication is cookie-only; JWTs are not persisted in `localStorage`. The API validates `Origin` on cookie-authenticated mutations.
- Markdown source is pinned to an immutable commit; CSP and CI check the required origin, with a synchronized local fallback. The public loan list uses a cursor, with a default of 50 and maximum of 100 rows per page.
- API: actor-attributed `AuditLog` rows are written in the same transaction for user, category, equipment, responsible-party, occurrence, and loan mutations; inventory transaction IDs are deterministically sorted and Prisma P2034 conflicts map to HTTP 409. RFID provisioning no longer returns a secret; WebSocket path/origin are restricted and cookie mode uses a one-time code.
- Additional hardening: Zod bounds, 72-byte password limit, credential/PII log redaction, export-field correction and cache headers; production Node images are pinned by digest and Nginx templates restrict origin access to Cloudflare ranges.
- Production API deployment recorded at commit `14b0716110750857daa27d0e979e3bec574e39e0`; migration `20261028173000_user_management_audit` was applied, API/migration images were built, and the service was restarted. `/health` and `/ready` succeeded locally and through `https://api.eduassets.tech`.
- Before migration, a PostgreSQL 18.6 custom-format backup was created, encrypted with `age`, and transferred to Cloudflare R2. The password was read through mode-0600 `PGPASSFILE`; the object was listed at the destination. The first upload returned HTTP 501, but the automatic retry succeeded. This was a manual run; it does not record a schedule, retention policy, or restore of the production object.
- Hosted API CI run `40769671846` completed both `verify` and `production-smoke` successfully. The guides distinguish code checks, operator-reported production evidence, and operations not exercised against the production database.

## v1.0.0 — Official release — October 28, 2026

- Official 1.0.0 status was applied across the app, API, documentation, and site repositories; the frontend package already used version 1.0.0 and the site package was aligned.
- The browser client consolidated cookie-first sessions with `HttpOnly`, `SameSite=Lax`, `Secure` on HTTPS, and `Origin` validation for mutations, with controlled legacy Bearer compatibility and one-time-code RFID exchange.
- The `#login` entry prevents protected content from appearing before authorization; Guest Mode uses server-side allowlisted projections and API routes enforce permissions.
- The documentation center uses one catalog for the About page and modal; bilingual guides can load from the canonical host and have a local fallback.
- The public site received stronger challenge/solution hierarchy, one-line navigation, a stack with local SVG logos, grouped documentation, and a profile card fitted to its portrait and social links.
- Operational and hosting guides were revised alongside architecture, data, API, and operations documentation; the changelog keeps the October 23 topology as a dated snapshot, not a current service-health statement.

## Sessions, entry gate, and documentation center — October 26–27, 2026
- The browser negotiates session support through `/auth/session-capabilities`; when available, sessions use an `HttpOnly`, `SameSite=Lax` cookie, `Secure` on HTTPS, and Origin validation for state-changing requests. Bearer remains for compatibility/fallback only.
- Cookie-mode RFID login exchanges a one-time code that expires in 30 seconds for a browser session; legacy channels may still use the JWT event.
- The `#login` entry route prevents the protected app from flashing during bootstrap; direct `#app` access waits for session/Guest authorization.
- Theme/language controls in Settings were aligned with the login screen; PT/EN UI copy now describes explicit save behavior.
- The About page and documentation modal now render cards from the same registry. Bilingual API/development guides and deployment/hosting guides are registered. The `site-eduassets` portfolio now reads Markdown from `docs.eduassets.tech` in an accessible dialog with search, table of contents, internal links, and sanitization; the reader supports PT-BR/EN.
- READMEs, manuals, architecture, data model, hosting, roadmap, and changelogs were reconciled with source/recorded CI; release instructions now distinguish schema-free updates from backup-and-migrate releases.

## Deployment and hosting documentation — October 23, 2026
- Frontend deployed on Cloudflare Pages at `app.eduassets.tech`; the landing page remains separate at `eduassets.tech`.
- API deployed at `api.eduassets.tech` on the Oracle Cloud Ubuntu VM, behind Nginx and using remote PostgreSQL on Neon.
- Fixed the inbound block caused by a generic `REJECT` before the UFW chains: explicit TCP 80/443 rules were inserted before the block without exposing port 3000.
- Validated external HTTPS and the `OPTIONS /ready` CORS preflight with `Access-Control-Allow-Origin: https://app.eduassets.tech`.
- The Pages CSP now allows the official Cloudflare Web Analytics beacon at `static.cloudflareinsights.com`.
- Added the bilingual `Hospedagem.md` and `Hosting.md` runbooks and registered them in the frontend documentation view.
- That dated record identified off-host backup, a restore drill, monitoring/alerts, and the final real-data review as operational follow-up topics.

## Remediation and release preparation — October 22, 2026
- Removed in-memory authentication/persistence fallbacks and the default JWT secret; environment validation fails early for missing/invalid database, secret, CORS, port and production proxy trust.
- Fixed the Administrator idle timeout using the JWT identifier and fail-closed handling when activity state cannot be established; an incorrect current password no longer clears the session. Logout and password changes now update a PostgreSQL-backed `sessionVersion` to revoke older JWTs, including across instances.
- Loans: create/edit/return operations serialize transactional state changes; repeated return updates stock once. Occurrence resolution/deletion locks concurrent transitions to prevent duplicate inventory adjustments.
- Guest Mode remains available with endpoint-specific allowlisted DTOs for equipment, loans and occurrences; personal names, free-text notes and issue details are omitted/masked; responsible-party and user listings require authentication.
- The return flow sends the user's selected offset-aware timestamp; legacy clients may omit it and use server time. Export filters use inclusive local-calendar boundaries.
- `/health` is liveness and `/ready` probes PostgreSQL with a timeout; responses do not reveal connection/provider details. Backend build and Prisma Client generation work without `DIRECT_URL` via the `DATABASE_URL` fallback.
- Added separate local env templates and production template, a multi-stage backend Dockerfile and Compose file with loopback-only host binding, RFID disabled, sanitized Nginx/Cloudflare proxy template, backup/restore scripts restricted to empty DB, PostgreSQL CI workflow and integration/race tests.
- Seed display names are synthetic and existing passwords are not overwritten; seed execution remains explicit and requires configured `SEED_*` variables.
- Local `npm run dev` no longer applies migrations automatically; `npm run dev:db` is the explicit development-database preparation command. The frontend waits for `/ready` and stops with the backend if the backend process fails.
- Sandbox verification recorded on Oct 22: 36 frontend tests across 9 files, 30 backend unit tests, frontend typecheck/build, backend TypeScript build, Prisma generation, JSON/YAML validation and `prisma validate` passed. PostgreSQL, migrations, seed, the 9 HTTP/concurrency integration tests, production image build and readiness were not run locally because those services/tools were unavailable in the sandbox; hosted CI run `39875293195` passed both `verify` and `production-smoke`, including those checks.
- That record covers the listed CI and sandbox checks; it does not report browser/hardware test results or continuous verification of external services. No remote database, public resource or production environment was accessed or changed in that documentation session.

- Added bounded loan/occurrence payloads, raised user/password-change minimum to 12 characters, handled async feature initialization failures, and escaped documentation TOC/search text.
- The dependency audit recorded in that run found three high-severity findings in the Prisma 6 development/migration toolchain; this historical note is not a current audit result.

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
