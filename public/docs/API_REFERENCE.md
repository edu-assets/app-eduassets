# eduAssets API Reference

> This reference describes the routers and middleware currently present in source. Exact JSON request bodies are defined by the Zod schemas in `backend/src/schemas/`; this document does not replace server-side authorization.

## Base URL and transport

The Express API is mounted at the host root; there is no `/api` prefix in the current route mounting. In development, Vite proxies requests to `http://127.0.0.1:3000`. Production frontend builds require `VITE_API_BASE_URL` to contain the API origin, without adding a prefix that the server does not mount.

JSON routes use `Content-Type: application/json`. The API validates request bodies with Zod, applies rate limits, and centralizes errors. Error responses contain an `erro` JSON key and may include `detalhes` for validation failures. Interpret the HTTP status together with the response body.

## Sessions, credentials, and CSRF

The browser uses cookie-only sessions. The frontend checks `GET /auth/session-capabilities` (`Cache-Control: no-store`); login requests `X-Auth-Mode: cookie`, sends `credentials: include`, and receives the user profile without exposing a JWT. If the capability request fails or returns anything other than `cookieSession: true`, login fails closed with no Bearer fallback and no token written to `localStorage`. The cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/`, expires with the JWT, and on production HTTPS is `Secure` and named `__Host-eduassets_session`.

For authenticated cookie-based state-changing requests (`POST`, `PUT`, `PATCH`, or `DELETE`), the backend requires an `Origin` allowed by the CORS configuration. Do not remove that check to work around CORS failures. Browsers must use an authorized web origin and proxy/TLS configuration that correctly conveys HTTPS.

The API middleware still accepts `Authorization: Bearer <JWT>` for legacy non-browser integrations. The current browser app does not send that header, keep a token fallback, or persist JWTs in `localStorage`; cookie-authenticated mutations require an allowed `Origin`. Never include real cookies, JWTs, passwords, or secrets in logs or examples.

## Authentication and health

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/` | Public | Basic status response. |
| `GET` | `/health` | Public | Process liveness. |
| `GET` | `/ready` | Public | Readiness with a bounded PostgreSQL check. |
| `GET` | `/auth/session-capabilities` | Public | Reports whether the server supports browser cookie sessions (`cookieSession`), whether email password recovery is configured (`passwordRecovery`) and whether push notifications are available (`pushNotifications`). |
| `POST` | `/auth/login` | Public; rate limited, with Origin validation when cookie mode is requested | Authenticates `login` and `password`; sets the cookie and returns the profile in cookie mode, including `senhaAlteradaEm` (ISO 8601 or `null`) like `GET /auth/me`. |
| `GET` | `/auth/me` | Authenticated session | Returns the current session profile, including `senhaAlteradaEm` (ISO 8601 or `null`), derived from the audit log (`PASSWORD_CHANGE`, `PASSWORD_RESET`, `PASSWORD_RESET_SELF`). |
| `POST` | `/auth/logout` | Authenticated session | Revokes the user's session version and clears the cookie. Returns `204`. |
| `PATCH` | `/auth/senha` | Authenticated session | Changes the password using `senhaAtual` and `novaSenha`; successful changes reissue the current session. |
| `POST` | `/auth/senha/recuperar` | Public; 10 requests per IP every 15 min and 3 per email per hour; Origin validated in cookie mode | Body `{ "login": "...", "idioma": "pt" \| "en" }`. Always answers `202` with the same body, before any lookup, so it never reveals whether the account exists. When the login is the email of an active account, it invalidates earlier links, stores only the SHA-256 hash of a random 256-bit token valid for 30 minutes, records `PASSWORD_RESET_REQUEST` and emails the link `APP_PUBLIC_URL/#redefinir-senha=<token>` in the requested language (HTML with an inline banner plus plain text; Reply-To set to `SUPPORT_EMAIL` when configured). Returns `503` when SMTP is not configured. |
| `POST` | `/auth/senha/redefinir` | Public; 10 attempts per IP every 15 min; Origin validated in cookie mode | Body `{ "token": "...", "senha": "..." }` following the strong policy. Consumes the token (single use), stores the new hash, increments `sessionVersion` (ending every session), deletes the account's other tokens and records `PASSWORD_RESET_SELF`. An invalid, expired or used token returns `400` `backend.auth.link_recuperacao_invalido`. Returns `204`. |
| `POST` | `/auth/rfid` | Only when `RFID_BRIDGE_ENABLED=true`; authorized bridge | Receives an RFID scan from the bridge process; it is not a browser login endpoint. |
| `POST` | `/auth/rfid/session` | Only when RFID bridge is enabled; short-lived one-time code | Exchanges an RFID login code for the browser session cookie. |

## Inventory and operations

`optionalAuth` permits public Guest Mode reads, but requires authentication if the request supplies a cookie or token. Present cookies are validated; an invalid session is not treated as anonymous. Public responses use minimized projections defined on the server.

| Method | Path | Access |
|---|---|---|
| `GET` | `/categorias` | Public/guest or authenticated. |
| `POST` | `/categorias` | Administrator. |
| `GET` | `/equipamentos` | Public/guest or authenticated. |
| `POST`, `PATCH` | `/equipamentos`, `/equipamentos/:id` | Administrator. When `PATCH` sends `quantidadeTotal` without `quantidadeDisponivel`, the server applies the difference to `quantidadeDisponivel` atomically under a row lock and answers `409` `backend.equipamentos.quantidade_em_uso` if the new total is below the units in use; sending both fields keeps the explicit values. |
| `GET` | `/emprestimos` | Public/guest or authenticated. Without a session, accepts `limit` (default 50, maximum 100) and a positive `cursor`; returns `{ items, nextCursor, limit }` in descending ID order with a reduced public projection. |
| `POST` | `/emprestimos` | Authenticated user (editor or administrator). `dataRetirada` more than 5 minutes in the future returns `400` `backend.emprestimos.data_retirada_futura`. |
| `PATCH` | `/emprestimos/:id` | Authenticated user; updates loan items. |
| `PATCH` | `/emprestimos/:id/devolver` | Authenticated user; records a return. `dataDevolucao` is optional (omitted = server time). More than 5 minutes in the future returns `400` `backend.emprestimos.data_devolucao_futura`; earlier than the checkout, compared at minute precision, returns `400` `backend.emprestimos.data_devolucao_anterior`. |
| `GET` | `/ocorrencias` | Public/guest or authenticated; reduced public projection. |
| `POST`, `PATCH` | `/ocorrencias`, `/ocorrencias/:id` | Authenticated user. |
| `PATCH` | `/ocorrencias/:id/resolver` | Authenticated user. |
| `DELETE` | `/ocorrencias/:id` | Administrator. |
| `GET` | `/responsaveis` | Authenticated session. |
| `POST` | `/responsaveis` | Administrator. |
| `GET`, `POST` | `/usuarios` | Administrator. `POST` and `PATCH /usuarios/:id` require an email-format `login` (password sign-in is unchanged and existing accounts keep working). Password recovery only works if the mailbox exists. `GET` includes `criadoPor` and `atualizadoPor`. |
| `PATCH` | `/usuarios/:id` | Administrator; updates name, login, access level or the `ativo` status. Errors: `400` `backend.usuarios.nao_pode_desativar_a_si_mesmo`, `400` `backend.usuarios.nao_pode_rebaixar_a_si_mesmo` and `409` `backend.usuarios.ultimo_administrador` (at least one active administrator must remain). |
| `POST` | `/usuarios/:id/password-reset` | Administrator; body `{ "senha": "..." }` following the strong policy (12+ characters, uppercase, lowercase, digit, symbol, max. 72 bytes). Stores the new hash, increments `sessionVersion` (ending the user's sessions) and records `PASSWORD_RESET` in the audit log in the same transaction. Returns `204`. Used by the **Reset password** action in **Records → System Users**. |
| `POST`, `DELETE` | `/usuarios/:id/rfid-token` | Administrator; provisions or revokes an RFID token. |

## Data synchronization

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/sync/estado?desde=<int optional>` | Authenticated user (editor or administrator). | Lightweight change feed the app uses to refresh data automatically. |

Response `200`: `{ "serverTime": "<ISO 8601>", "cursor": "<string>", "entidades": ["Emprestimo", "Equipamento", ...] }`.

- `cursor` marks a position in the change history (it stays a few seconds behind the newest change so transactions committed out of order are not missed); send it back as `desde` on the next call. `entidades` lists the kinds of records changed since `desde` — only `Categoria`, `Emprestimo`, `Equipamento`, `Ocorrencia` and `Responsavel` (empty on the first call without `desde`). A recent change may be reported by two consecutive calls.
- Only entity names are returned, never record contents or who changed them. `serverTime` is the server clock, used by the app for automatic date and time fields.
- This endpoint never renews the administrator's 30-minute idle timeout.
- Errors: `400` `backend.validacao.dados_invalidos` for an invalid `desde` or an unknown parameter; `401` when not authenticated or the session expired; `429` `backend.seguranca.muitas_requisicoes` (own limit of 900 requests per 15 min per IP, separate from the global limit).
- Optional header `X-EduAssets-Atividade: passiva`: on any authenticated request it keeps all checks but does not count as administrator activity (used by automatic background refreshes). It can only shorten a session, never extend it.

## Push notifications

Enrollment of administrator devices for Web Push notifications (Push API + service worker + VAPID). Every route requires `requireAdmin`; `PUT`, `DELETE` and `POST /teste` are limited to 30 requests per 15 minutes per user. Availability is reported by `pushNotifications` in `GET /auth/session-capabilities`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/notificacoes/push/config` | Administrator | Returns `{ habilitado: boolean, chavePublica: string \| null }`. |
| `PUT` | `/notificacoes/push/inscricao` | Administrator; rate limited | Body `{ inscricao: { endpoint, keys: { p256dh, auth } }, preferencias: { emprestimo, devolucao, ocorrencia } }`. Upserts by `endpoint` and returns `200` with `{ preferencias }`. An endpoint previously linked to another user moves to the current user. |
| `DELETE` | `/notificacoes/push/inscricao` | Administrator; rate limited | Body `{ endpoint }`. Removes only the caller's own subscription. Returns `204`. |
| `POST` | `/notificacoes/push/teste` | Administrator; rate limited | Sends a test only to the caller's own devices. Returns `202`. |

- `endpoint` must be `https`, without credentials or a port, and its host must be on the push-service allowlist: `fcm.googleapis.com`, `*.push.apple.com`, `*.push.services.mozilla.com` and `*.notify.windows.com`. The check is repeated at send time (SSRF protection).
- `PUT` and `POST /teste` respond `503` with `{ erro: 'backend.notificacoes.push_indisponivel' }` when push is not configured. Other error keys: `backend.notificacoes.endpoint_invalido`, `backend.notificacoes.chave_invalida`, `backend.notificacoes.preferencias_invalidas` and `backend.notificacoes.muitas_requisicoes`.
- Payload received by the service worker: `{ v: 1, tipo: 'EMPRESTIMO_CRIADO' | 'DEVOLUCAO_REGISTRADA' | 'OCORRENCIA_REGISTRADA' | 'TESTE', titulo, corpo, url, tag, criadoEm }`.
- Delivery happens after the operation is committed and never delays or fails the original request. TTL is 1 hour and urgency `high`. A `404` or `410` response from the push service removes the subscription.
- Notification click targets: loan and return open `/#panel-dashboard` (History tab); occurrence opens `/#panel-controle`; test opens `/#panel-inicio`.

## Record authorship

Authenticated responses (Administrator or Editor) for loans, occurrences, equipment, categories and responsible parties include author objects `{ id, nome }` (or `null`): `criadoPor` and `atualizadoPor` where the entity has them, `devolvidoPor` on loans and `resolvidoPor` on occurrences; categories and responsible parties only have `criadoPor`. Guests never receive authorship data; guest `GET /categorias` returns `{ id, nome }`. The fields come from migration `20261113150000_record_authorship` (see the Data Model).

## Validation and rules

- `:id` parameters are validated as positive integers by routes that accept them.
- Request bodies are validated against schemas in `backend/src/schemas/`; consult those source files before building or integrating a client.
- `requireAuth` validates the token, user existence, session version, and current role against the database.
- `requireAdmin` checks the role currently stored in the database. Hiding or disabling a frontend action does not replace this protection.
- State-changing cookie requests are rejected with `403` when the Origin is untrusted. `401` means missing or invalid authentication; `403` indicates an untrusted Origin or insufficient permission.
- `/responsaveis` and `/usuarios` are not public endpoints. Do not expand anonymous responses without reviewing data minimization.
- RFID endpoints only exist when enabled by configuration; the reference deployment keeps this flow disabled/unreachable from the public edge.

## Source references

- Route mounting: [`backend/src/routes/index.ts`](https://github.com/edu-assets/api-eduassets/blob/main/backend/src/routes/index.ts) and [`backend/src/app.ts`](https://github.com/edu-assets/api-eduassets/blob/main/backend/src/app.ts) in the backend repository.
- Authentication and cookies: backend files [`auth.ts`](https://github.com/edu-assets/api-eduassets/blob/main/backend/src/routes/auth.ts), [`auth middleware`](https://github.com/edu-assets/api-eduassets/blob/main/backend/src/middlewares/auth.ts), [`CSRF middleware`](https://github.com/edu-assets/api-eduassets/blob/main/backend/src/middlewares/csrf.ts), and [`sessionCookie.ts`](https://github.com/edu-assets/api-eduassets/blob/main/backend/src/lib/sessionCookie.ts).
- Schemas: [`backend/src/schemas/`](https://github.com/edu-assets/api-eduassets/tree/main/backend/src/schemas) in the backend repository.
- Browser client: `src/core/api/apiClient.ts` and `src/core/api/auth.ts` in this frontend repository.
