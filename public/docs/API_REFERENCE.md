# eduAssets API Reference

> This reference describes the routers and middleware currently present in source. Exact JSON request bodies are defined by the Zod schemas in `backend/src/schemas/`; this document does not replace server-side authorization.

## Base URL and transport

The Express API is mounted at the host root; there is no `/api` prefix in the current route mounting. In development, Vite proxies requests to `http://127.0.0.1:3000`. Production frontend builds require `VITE_API_BASE_URL` to contain the API origin, without adding a prefix that the server does not mount.

JSON routes use `Content-Type: application/json`. The API validates request bodies with Zod, applies rate limits, and centralizes errors. Error responses contain an `erro` JSON key and may include `detalhes` for validation failures. Interpret the HTTP status together with the response body.

## Sessions, credentials, and CSRF

The current browser flow prefers cookie sessions when `GET /auth/session-capabilities` returns `{"cookieSession":true}`. This endpoint sets `Cache-Control: no-store`. The frontend then sends requests with `credentials: include`; login requests `X-Auth-Mode: cookie` and receives the user profile without exposing the JWT in the response. The cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/`, and expires with the JWT. On production HTTPS it is `Secure` and named `__Host-eduassets_session`.

For authenticated cookie-based state-changing requests (`POST`, `PUT`, `PATCH`, or `DELETE`), the backend requires an `Origin` allowed by the CORS configuration. Do not remove that check to work around CORS failures. Browsers must use an authorized web origin and proxy/TLS configuration that correctly conveys HTTPS.

The authentication middleware also accepts `Authorization: Bearer <JWT>` for older clients and fallback modes. The frontend uses this option only when the API does not advertise cookie support. Avoid storing JavaScript-readable access tokens when an HttpOnly cookie is available. Never include real cookies, JWTs, passwords, or secrets in logs or examples.

## Authentication and health

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/` | Public | Basic status response. |
| `GET` | `/health` | Public | Process liveness. |
| `GET` | `/ready` | Public | Readiness with a bounded PostgreSQL check. |
| `GET` | `/auth/session-capabilities` | Public | Reports whether the server supports browser cookie sessions. |
| `POST` | `/auth/login` | Public; rate limited, with Origin validation when cookie mode is requested | Authenticates `login` and `password`; sets the cookie and returns the profile in cookie mode. |
| `GET` | `/auth/me` | Authenticated session | Returns the current session profile. |
| `POST` | `/auth/logout` | Authenticated session | Revokes the user's session version and clears the cookie. Returns `204`. |
| `PATCH` | `/auth/senha` | Authenticated session | Changes the password using `senhaAtual` and `novaSenha`; successful changes reissue the current session. |
| `POST` | `/auth/rfid` | Only when `RFID_BRIDGE_ENABLED=true`; authorized bridge | Receives an RFID scan from the bridge process; it is not a browser login endpoint. |
| `POST` | `/auth/rfid/session` | Only when RFID bridge is enabled; short-lived one-time code | Exchanges an RFID login code for the browser session cookie. |

## Inventory and operations

`optionalAuth` permits public Guest Mode reads, but requires authentication if the request supplies a cookie or token. Present cookies are validated; an invalid session is not treated as anonymous. Public responses use minimized projections defined on the server.

| Method | Path | Access |
|---|---|---|
| `GET` | `/categorias` | Public/guest or authenticated. |
| `POST` | `/categorias` | Administrator. |
| `GET` | `/equipamentos` | Public/guest or authenticated. |
| `POST`, `PATCH` | `/equipamentos`, `/equipamentos/:id` | Administrator. |
| `GET` | `/emprestimos` | Public/guest or authenticated; reduced public projection. |
| `POST` | `/emprestimos` | Authenticated user (editor or administrator). |
| `PATCH` | `/emprestimos/:id` | Authenticated user; updates loan items. |
| `PATCH` | `/emprestimos/:id/devolver` | Authenticated user; records a return. |
| `GET` | `/ocorrencias` | Public/guest or authenticated; reduced public projection. |
| `POST`, `PATCH` | `/ocorrencias`, `/ocorrencias/:id` | Authenticated user. |
| `PATCH` | `/ocorrencias/:id/resolver` | Authenticated user. |
| `DELETE` | `/ocorrencias/:id` | Administrator. |
| `GET` | `/responsaveis` | Authenticated session. |
| `POST` | `/responsaveis` | Administrator. |
| `GET`, `POST` | `/usuarios` | Administrator. |
| `POST`, `DELETE` | `/usuarios/:id/rfid-token` | Administrator; provisions or revokes an RFID token. |

## Validation and rules

- `:id` parameters are validated as positive integers by routes that accept them.
- Request bodies are validated against schemas in `backend/src/schemas/`; consult those source files before building or integrating a client.
- `requireAuth` validates the token, user existence, session version, and current role against the database.
- `requireAdmin` checks the role currently stored in the database. Hiding or disabling a frontend action does not replace this protection.
- State-changing cookie requests are rejected with `403` when the Origin is untrusted. `401` means missing or invalid authentication; `403` indicates an untrusted Origin or insufficient permission.
- `/responsaveis` and `/usuarios` are not public endpoints. Do not expand anonymous responses without reviewing data minimization.
- RFID endpoints only exist when enabled by configuration; the reference deployment keeps this flow disabled/unreachable from the public edge.

## Source references

- Route mounting: `backend/src/routes/index.ts` and `backend/src/app.ts`.
- Authentication and cookies: `backend/src/routes/auth.ts`, `backend/src/middlewares/auth.ts`, `backend/src/middlewares/csrf.ts`, and `backend/src/lib/sessionCookie.ts`.
- Schemas: `backend/src/schemas/`.
- Browser client: `frontend/src/core/api/apiClient.ts` and `frontend/src/core/api/auth.ts`.
