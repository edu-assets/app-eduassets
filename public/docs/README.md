# eduAssets

<div align="center">
  <img src="frontend/public/assets/img/eduAssets_banner.png" alt="EduAssets banner" width="100%">
</div>

> **Status: Beta (v0.9.9).** Core functionality — including authentication with two access levels, RFID-based physical card login, Guest Mode, Dark Mode, and data export — is implemented end-to-end across a fully TypeScript frontend and backend. The project is in final polish before its first public deployment. Minor adjustments and hardening are still expected before a stable 1.0 release.

## Overview

**eduAssets** is a school equipment loan and inventory management system built as a portfolio project. It targets daily operational use by a small group of users (system administrators and editors), and its design decisions favor low-friction, high-frequency workflows over granular per-unit asset tracking.

The system covers five core operations:
- Registering new equipment loans
- Processing returns
- Monitoring stock levels and loan history through a dashboard, with search/filter on both the stock and history views
- Tracking equipment issues (observations, maintenance, and broken units) through a dedicated control panel, with search/filter
- Exporting loan/return history and equipment inventory as CSV, Excel, or PDF reports

Since eduAssets is meant to be publicly accessible as a portfolio piece, it ships with a **Guest Mode**: anyone can open the live deployment and explore the full application in read-only mode, while all data-mutating actions are restricted to authenticated users. Authenticated access itself is split into two levels (Administrator and Editor) with different permissions — see [Authentication & Access Levels](#authentication--access-levels).

The interface also supports **Dark Mode**, with automatic detection of the operating system's color scheme, manual override (Light / Dark / System), and persistence of the chosen preference across sessions.

As an optional hardware extension, eduAssets supports **RFID card login**: a Raspberry Pi (or Arduino Nano) running a small bridge service can read a physical RFID card and log the matching user in automatically across every open browser tab, without typing a password. See [RFID Card Login](#rfid-card-login).

UI/UX decisions follow a set of internal design guidelines focused on functional minimalism: no decorative elements without informational value, no redundant content between panels, and no self-promotional copy.

## Tech Stack

### Frontend
- **TypeScript** (fully migrated from the original vanilla JS codebase) compiled via [Vite](https://vitejs.dev/), ES Modules, no separate bundler config beyond `vite.config.js`
- **Feature-first architecture** (see [Architecture](#architecture) below) — already implemented, not just planned
- [flatpickr](https://flatpickr.js.org/) for datetime input handling
- [SheetJS (xlsx)](https://sheetjs.com/) and [jsPDF](https://github.com/parallax/jsPDF) + `jspdf-autotable`, loaded via CDN in `index.html`, for Excel and PDF export
- Material Symbols Outlined for iconography, subset at build time via a custom script (`scripts/extract-icons.mjs` + `scripts/subset-icons.mjs`) to keep the icon font small
- Theming implemented purely with CSS Custom Properties (`base/variables.css`), scoped via `html[data-theme]` — no component-level style duplication between Light and Dark
- A lightweight native WebSocket client (`core/rfid/rfidListener.ts`) that listens for RFID login events pushed by the backend and reloads the session automatically
### Frontend (planned)
- Migrate to React + TypeScript (v2), building on the current feature-first, layered structure so the migration only touches the rendering layer
### Backend
- Node.js + **Express 5**
- **Prisma ORM** 6, PostgreSQL, hosted via Supabase
- **TypeScript**, strict mode
- JWT-based authentication (`jsonwebtoken`), bcrypt password hashing
- **`ws`** for a loopback-only WebSocket bridge (`/ws/rfid`) that pushes RFID login events to connected browser tabs
- **Security middleware**: `helmet` for HTTP security headers, `express-rate-limit` for both a global request limiter and a dedicated, stricter limiter on the login endpoints (password login and RFID login share the same limiter)
- Zod schemas for request validation on every mutating route
- Centralized Prisma-aware error handler (`errorHandler.ts`) mapping known Prisma error codes to appropriate HTTP responses
- In-memory idle-session tracking for administrator accounts (`lib/adminActivity.ts`), enforced on every authenticated request
### Hardware bridge (optional — `rpi/`)
- **Python 3** service (`rfid_admin_bridge.py`) that runs on a Raspberry Pi (native SPI, via `spidev`) or relays through an **Arduino Nano** connected over USB serial, abstracted behind a common `RfidReaderBase` interface (`rfid_reader.py`)
- Talks to the backend over a shared-secret-protected, loopback-only HTTP endpoint (`POST /auth/rfid`)
- Local audio feedback (tone synthesis + `aplay`, no external sound files) for card detection, success, and error states
- `provision_card.py` for writing a freshly generated token onto a physical card
- Ships as a `systemd` unit (`eduassets-rfid.service`) for always-on operation on the Pi
### Hosting (planned)
- **Frontend:** Vercel
- **Backend:** Render

---

## Authentication & Access Levels

eduAssets uses a three-tier access model:

- **Guest (default):** granted automatically on page load, no login required. Can view the Dashboard, Loan History, and inventory data, but cannot create, edit, or delete anything.
- **Editor (authenticated):** can register loans, process returns, and create/edit Controle records (observations, maintenance, broken-equipment entries), but cannot access Cadastros, save Configurações, delete Controle records, or manage RFID cards — those remain administrator-only.
- **Administrator (authenticated):** full CRUD access across all panels, including Cadastros (equipment, staff, users, and categories), record deletion, account management (password change), and RFID card provisioning for any user.

Enforcement happens on both layers:
- **Frontend:** write-triggering controls are marked with a `data-requires-auth` (Editor+) or `data-requires-admin` (Administrator only) hook that visually disables them outside the required access level, and every mutating event handler calls a `bloquearSeConvidado()` or `bloquearSeNaoAdmin()` guard before making an API call.
- **Backend:** every route that creates, updates, or deletes data is protected by a `requireAuth` (any authenticated user) or `requireAdmin` (administrators only) middleware that validates a JWT sent via `Authorization: Bearer <token>`. Frontend restrictions exist only for UX — the backend is the actual security boundary.

Login is handled via `POST /auth/login` (rate-limited to prevent brute-force attempts), session persistence is validated on app boot via `GET /auth/me`, and any authenticated user can change their own password via `PATCH /auth/senha` (requires re-entering the current password), surfaced in the **Segurança** panel.

**Idle session timeout:** administrator sessions (only) expire automatically after 30 minutes of inactivity, tracked both client-side (`core/auth/sessionTimeout.ts`, listening for mouse/keyboard/scroll/touch activity) and server-side (`backend/src/lib/adminActivity.ts`), so the timeout can't be bypassed by simply keeping a tab open without interacting with the backend. Editor sessions are not subject to this timeout.

> **Note:** the Cadastros panel is treated as fully admin-only (including viewing and listing registered items).

---

## RFID Card Login

As an optional hardware extension, any registered user (Administrator or Editor) can have a physical RFID card linked to their account for one-tap login, without typing a password.

- **Provisioning:** from **Cadastros → Usuários**, an administrator generates a one-time token for a user (`POST /usuarios/:id/rfid-token`) and writes it to a physical card using `rpi/provision_card.py`. The token is shown only once and stored server-side as a SHA-256 hash (`Usuario.rfidTokenHash`, unique); it can be regenerated or revoked (`DELETE /usuarios/:id/rfid-token`) at any time.
- **Reading:** a small Python bridge service (`rpi/rfid_admin_bridge.py`) runs continuously on a Raspberry Pi or an Arduino Nano (bridged over USB serial), waits for a card, reads its token, and posts it to a loopback-only, shared-secret-protected backend endpoint (`POST /auth/rfid`).
- **Login propagation:** on a valid scan, the backend issues a JWT and broadcasts a login event over a WebSocket (`/ws/rfid`, also loopback-only) to every open browser tab pointed at the app, so the person is logged in automatically wherever the app is open on that machine.
- **Feedback:** the Pi/Arduino bridge plays distinct synthesized tones for card detection, successful login, and errors (unrecognized card, backend unreachable), so no screen is needed to know a scan worked.

This is entirely optional — the web app works fully without any RFID hardware attached, using password login instead.

---

## Dark Mode

Theme preference is treated as a device/person-level setting, not application data — it works identically for Guests and authenticated users of any level, and is never gated behind `bloquearSeConvidado()`.

- **Automatic detection:** on first visit, the theme follows the OS setting via `prefers-color-scheme`, and stays in sync live if the OS theme changes while the app is open.
- **Manual override:** a Light / Dark / System toggle is available in **Configurações → Aparência**.
- **Persistence:** the chosen preference is stored in `localStorage` and restored on every load.
- **No flash of incorrect theme:** an inline script in `index.html`'s `<head>` applies the saved/detected theme to `<html data-theme="...">` before first paint, ahead of the ES module bundle.
- **Single source of truth for color:** every theme value lives in `frontend/src/styles/base/variables.css`, scoped under `html[data-theme="dark"]`. All components consume semantic tokens (`--surface-white`, `--text-primary`, `--border-color`, feedback colors, etc.) rather than raw color values, so no component stylesheet needs theme-specific overrides.
- **State module:** `frontend/src/core/state/themeStore.ts` follows the same store pattern as the rest of the app's state (`subscribe` / `notify`), exposing `getPreferenciaTema()`, `getTemaResolvido()`, and `definirTema()`.

---

## Architecture

The frontend already follows the feature-first, layered architecture defined internally as the project's engineering standard:

- **`core/`** — infrastructure only, never business logic: API client + per-entity API modules, auth guards (`guestGate`, `permissions`, `sessionTimeout`), layout (navigation, mobile nav), state stores, UI primitives (modal, toast, confirm, datepicker), the RFID WebSocket listener, reusable utilities, and framework-agnostic services (CSV/Excel/PDF export).
- **`features/`** — one folder per business screen (`dashboard`, `emprestimo`, `devolucao`, `controle`, `cadastros`, `exportar`, `config`, `seguranca`, `perfil`, `auth`), each internally split into `index.ts` (wiring), `events.ts`, `render.ts`, `templates.ts`, and `service.ts` where relevant. Templates only return HTML strings; events only orchestrate; business rules live in `service.ts`; state is the single source of truth and is never read back from the DOM.
- **`shared/`** — reusable UI building blocks not owned by any single feature (status badge, empty state, select options, DOM helpers).
- **`types/`** — centralized TypeScript interfaces for all entities, payloads, and UI-shaped data (`Loan`, `Equipamento`, `Ocorrencia`, `Usuario`, etc.), imported across the whole app instead of being redefined per file.

All dynamic HTML goes through an XSS-safe, tagged-template `html\`\`` helper (`core/utils/html.ts`) that auto-escapes interpolated values, with an explicit `raw()` escape hatch for trusted, already-sanitized HTML fragments.

---

## Current State

### Frontend

| Panel | Status | Notes |
| :--- | :--- | :--- |
| **Início** | Complete | hero login button opens the auth modal |
| **Novo Empréstimo** | Complete | Loan registration form, multi-item support; write-protected for Guests |
| **Devoluções** | Complete | Two-panel layout with persistent detail/edit sidebar; write-protected for Guests |
| **Dashboard** | Complete | Estoque and Histórico tabs (publicly viewable), category detail panel (admin-only editing), loan history sourced from shared state, search/filter on both tabs |
| **Controle** | Complete | Four tabs (Observação, Manutenção, Quebrado, Resolvidos), create/edit modal with conditional "Medidas tomadas" field, row selection, Promise-based delete confirmation modal, search; creation/editing available to Editors and Administrators, deletion restricted to Administrators |
| **Cadastros** | Complete, admin-only | Modal-based CRUD for equipment, staff, users, and categories, wired to the backend; entire panel restricted to authenticated administrators; the Usuários list additionally supports generating, regenerating, and revoking RFID login tokens per user |
| **Exportar** | Complete | Exports Empréstimos/Devoluções or Equipamentos (with per-item selection) as CSV, Excel (SheetJS), or PDF (jsPDF + autotable), including detailed occurrence sections and optional notes |
| **Configurações** | Complete | Dark Mode toggle (Light / Dark / System) fully functional and persisted; notification preferences UI-only, save action restricted to administrators |
| **Segurança** | Complete | Authenticated password change (current + new password, confirmation, min. 8 characters), available to any authenticated user |
| **Meu Perfil** | Complete | Read-only summary of the logged-in account (name, login, access level) |
| **Sobre** | Complete | |
| **Autenticação (Login/Guest/RFID)** | Complete | Login modal, sidebar auth status badge, session persistence via JWT, automatic idle logout for administrators, optional RFID card login pushed over WebSocket |

> **Note:** State management (`core/state/loanStore.ts`) uses soft deletes (`status: 'DEVOLVIDO'` + `dataDevolucao`) instead of record deletion, preserving full loan history. Theme state follows the same lightweight store pattern (`subscribe`/`notify`) used across the rest of the app.

### Backend
- Prisma schema defined for `Categoria`, `Equipamento`, `Responsavel`, `Usuario`, `Emprestimo`, `ItemEmprestimo`, and `Ocorrencia`, with enums for access level, loan status, occurrence type, and occurrence status.
- `Usuario` extended with a `passwordHash` field for authentication and an optional, unique `rfidTokenHash` field for RFID card login.
- Full CRUD endpoints implemented for all entities (`/categorias`, `/equipamentos`, `/responsaveis`, `/usuarios`, `/emprestimos`, `/ocorrencias`).
- `POST /auth/login`, `GET /auth/me`, `PATCH /auth/senha`, and `POST /auth/rfid` implemented for password authentication, session validation, self-service password changes, and RFID-based login.
- `POST /usuarios/:id/rfid-token` and `DELETE /usuarios/:id/rfid-token` (admin-only) issue and revoke RFID login tokens; only their SHA-256 hash is ever persisted.
- A loopback-only WebSocket server (`lib/rfidBridge.ts`) upgrades `/ws/rfid` connections and broadcasts login events to connected browser tabs after a successful RFID scan.
- All mutating endpoints (`POST`/`PATCH`/`DELETE`) protected by a `requireAuth` (any authenticated user) or `requireAdmin` (administrators only) JWT middleware, depending on the operation; `GET` endpoints remain public to support Guest Mode.
- Administrator sessions are additionally checked against a 30-minute server-side idle timeout (`lib/adminActivity.ts`) on every authenticated request; an expired session returns a `sessaoExpirada` flag that the frontend uses to force a clean logout.
- Loan and occurrence stock movements (creating/editing loans, returns, maintenance/broken registrations) run inside Prisma transactions with atomic, race-condition-safe stock decrements (`lib/estoque.ts`), raising a typed `EstoqueInsuficienteError` with per-item details on insufficient stock.
- `helmet` security headers applied globally; a global rate limiter (300 req / 15 min) and a stricter limiter shared by the password and RFID login endpoints (10 attempts / 15 min) protect the API.
- Centralized error handling middleware maps known Prisma error codes (not found, invalid reference, unique constraint) to the correct HTTP status.
- Seed script (`prisma/seed.ts`) is idempotent (safe to re-run) and provisions starter categories, equipment, responsáveis, the initial administrator account, and (optionally) a test editor account, with passwords sourced from environment variables rather than hardcoded.
- Frontend fully consumes the real API across all connected panels — no in-memory/mock state remains.

### Hardware bridge (`rpi/`)
- Common `RfidReaderBase` interface with two interchangeable backends selected via `RFID_BACKEND`: native SPI (`spi_rfid_reader.py`, using `Rfid.py` for direct MFRC522 register access on a Raspberry Pi) or USB-serial relay to an Arduino Nano running `arduino_rfid_bridge.ino`.
- `rfid_admin_bridge.py` continuously reads cards and posts the token to the backend's `/auth/rfid` endpoint, protected by a shared secret and a loopback-only origin check.
- `provision_card.py` is a one-off CLI tool for writing a newly generated token onto a card.
- `sound.py` synthesizes short WAV tones in memory (no external audio assets) and plays them via `aplay`, failing silently if no audio device is configured so it never interrupts the login flow.
- Packaged as a `systemd` service (`eduassets-rfid.service`) for unattended operation.

---

## Project Structure

```
eduAssets/
├── frontend/
│   ├── public/
│   │   ├── assets/
│   │   │   ├── icons/
│   │   │   ├── img/
│   │   │   └── logos/
│   ├── scripts/
│   │   ├── extract-icons.mjs         # scans source for used icon names
│   │   └── subset-icons.mjs          # subsets the Material Symbols font
│   ├── src/
│   │   ├── main.ts               # entry point: theme init, session bootstrap, feature init
│   │   ├── core/
│   │   │   ├── api/               # apiClient (auto-attaches JWT), per-entity API modules
│   │   │   ├── auth/               # guestGate, permissions, sessionTimeout (idle logout)
│   │   │   ├── rfid/                # rfidListener — WebSocket client for RFID login events
│   │   │   ├── constants/          # breakpoints, etc.
│   │   │   ├── layout/             # navigation, mobile navigation
│   │   │   ├── services/           # csv.ts, excel.ts, pdf.ts (export services)
│   │   │   ├── state/               # stores: loans, equipment, occurrences, responsáveis, auth, token, theme
│   │   │   ├── ui/                  # toast, modal, confirm, datepicker
│   │   │   └── utils/                # escapeHtml, html`` tagged template, sanitize, misc helpers
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── cadastros/            # includes RFID card provisioning UI for Usuários
│   │   │   ├── config/               # settings panel, incl. Dark Mode toggle
│   │   │   ├── controle/
│   │   │   ├── dashboard/
│   │   │   ├── devolucao/
│   │   │   ├── emprestimo/
│   │   │   ├── exportar/
│   │   │   ├── perfil/
│   │   │   └── seguranca/
│   │   ├── shared/
│   │   │   ├── components/          # statusBadge, emptyState, selectOptions
│   │   │   └── dom/                  # fillSelect, overlayPanel
│   │   ├── types/                     # centralized TypeScript interfaces
│   │   └── styles/
│   │       ├── base/                  # reset, design tokens + Light/Dark theme values
│   │       ├── components/
│   │       ├── layout/
│   │       ├── panels/
│   │       └── utils/
│   ├── index.html                     # includes inline anti-flash theme script + CDN libs
│   ├── vite.config.js
│   └── tsconfig.json
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── lib/                       # jwt.ts, estoque.ts, validate.ts, adminActivity.ts, rfidBridge.ts, rfidToken.ts
│   │   ├── middleware/                 # auth.ts (requireAuth/requireAdmin), security.ts (helmet/rate limits), errorHandler.ts, notFound.ts
│   │   ├── routes/                     # auth.ts (incl. RFID login) + one router per entity
│   │   ├── schemas/                     # zod validation schemas
│   │   └── server.ts                    # HTTP + WebSocket upgrade for /ws/rfid
│   ├── prisma.ts
│   ├── prisma.config.ts
│   └── tsconfig.json
└── rpi/                                 # optional Raspberry Pi / Arduino RFID login bridge
    ├── rfid_admin_bridge.py             # main service loop
    ├── rfid_reader.py                   # RfidReaderBase interface + backend selection
    ├── spi_rfid_reader.py               # native SPI backend (Raspberry Pi)
    ├── Rfid.py                          # low-level MFRC522 register access over SPI
    ├── serial_rfid_reader.py            # USB-serial backend (Arduino Nano)
    ├── arduino_rfid_bridge.ino          # Arduino firmware for the serial backend
    ├── provision_card.py                # writes a generated token onto a physical card
    ├── sound.py                         # synthesized audio feedback (no external assets)
    ├── test_hardware.py                 # standalone SPI wiring/permissions sanity check
    ├── requirements.txt
    └── eduassets-rfid.service           # systemd unit for unattended operation
```

## Design System

Styling is driven by a CSS custom property token system defined in `frontend/src/styles/base/variables.css`:
- A blue-tinted slate scale for neutrals
- Primary (blue) and secondary (violet) color scales
- Semantic aliases (`--primary-color`, `--text-primary`, `--border-color`, etc.)
- Surface tokens for layered backgrounds
- Feedback colors for success, warning, error, and info states
- `--font-heading` (Poppins) and `--font-body` (Inter) via Google Fonts
- **Light and Dark themes** as a single set of token overrides scoped to `html[data-theme="dark"]`, layered on top of the same semantic aliases — components never branch on theme directly, so hierarchy (sidebar → page → card → nested surface) is preserved consistently across both modes

Button styles are consolidated into `styles/components/buttons.css` using a base `.btn` class with modifiers (`.btn-primary`, `.btn-success`, `.btn-neutral`, `.btn-warning`, `.btn-danger`).

The sidebar is intentionally fixed and non-collapsible on desktop (collapsing into an off-canvas drawer below the tablet breakpoint), a deliberate choice for a daily-use operational tool, and always renders on the darkest layer of the palette (`--bg-dark`) regardless of the active theme. Sidebar navigation styles are scoped to `.sidebar-nav .nav-link` to avoid leaking into other elements that reuse the `.nav-link` hook for JS navigation. The sidebar footer hosts the auth status badge and login/logout toggle.

Access-level restrictions are expressed declaratively: any control tagged `data-requires-auth` or `data-requires-admin` is automatically dimmed and disabled via `body.guest-mode` / `body.editor-mode` CSS rules, so newly rendered elements (e.g. dynamically generated table rows) are covered without additional JavaScript.

---

## Roadmap

- [x] Build modals for creating and editing records in the Controle panel
- [x] Refactor loan state to soft deletes for full history
- [x] XSS sanitization across dynamic HTML rendering
- [x] Define Prisma schema and run initial migration
- [x] Implement remaining backend CRUD endpoints (Equipamento, Responsavel, Usuario, Emprestimo, Ocorrencia)
- [x] Replace in-memory/mock frontend state with real API calls
- [x] Implement JWT authentication and Guest Mode (read-only public access, restricted mutations)
- [x] Implement Dark Mode with system detection, manual override, and persistence
- [x] Migrate the vanilla JS frontend to TypeScript
- [x] Refactor frontend into a feature-first, layered architecture (`core` / `features` / `shared` / `types`)
- [x] Add a "change password" flow for authenticated accounts
- [x] Connect the Exportar panel to real export logic (CSV/Excel/PDF)
- [x] Harden the API with security headers (`helmet`) and rate limiting
- [x] Make stock decrements race-condition-safe via atomic, transaction-scoped updates
- [x] Differentiate Administrator and Editor permissions on both frontend and backend
- [x] Add administrator idle-session timeout, enforced client- and server-side
- [x] Implement optional RFID physical card login (Raspberry Pi / Arduino bridge + WebSocket push)
- [ ] Accessibility improvements: focus trap in modals, `role="dialog"`
- [ ] Unit tests with Vitest for pure utility and service functions
- [ ] Properly configure CORS for production (currently a `TODO` in `server.ts`)
- [ ] First public deployment (Vercel + Render)
- [ ] Migrate to React + TypeScript (v2)

---

## Known Limitations (current)

- No password recovery flow yet ("Forgot password" in the login modal is not yet implemented); only an authenticated, in-session password change (Segurança panel) is available. The initial administrator password is set once via the seed script.
- RFID card login is an optional hardware add-on: it requires a Raspberry Pi (or an Arduino Nano bridged over USB) running the `rpi/` service on the same network/host as the backend, and both the WebSocket bridge and the `/auth/rfid` endpoint only accept loopback connections by design.
- Individual asset tracking (per-unit serial numbers) is out of scope for v1.
- `nivelAcesso` distinguishes `ADMINISTRADOR` and `EDITOR` with genuinely different permissions on both frontend and backend, but no finer-grained roles (e.g. per-panel permissions) exist yet.
- Dark Mode ships with a single alternate palette; the token structure supports additional themes in the future, but no theme picker beyond Light/Dark/System exists yet.
- CORS configuration is currently permissive by default when `CORS_ORIGIN` is unset — needs to be locked down before production deployment.

---

## Running Locally

### Frontend
1. Clone the repository
2. Navigate to the frontend directory:
```bash
   cd frontend
```
3. Install dependencies:
```bash
   npm install
```
4. (Optional) Create a `.env` file to point at a non-default backend URL:
```
   VITE_API_BASE_URL=http://localhost:3000
```
5. Start the dev server:
```bash
   npm run dev
```
> Vite serves the app on `http://localhost:5173` by default. Run `npm run build` to produce a production build in `dist/`, or `npm run typecheck` to run `tsc --noEmit`.

### Backend
1. Navigate to the backend directory:
```bash
   cd backend
```
2. Install dependencies:
```bash
   npm install
```
3. Create a `.env` file with the following variables:
```
   DATABASE_URL=<your Supabase Postgres connection string>
   DIRECT_URL=<your Supabase direct connection string>
   JWT_SECRET=<a long, random, unpredictable string — never reuse across environments>
   SEED_ADMIN_PASSWORD=<the password for the initial administrator account>
   SEED_EDITOR_PASSWORD=<optional — creates a test editor account when set>
   CORS_ORIGIN=<comma-separated list of allowed frontend origins, e.g. http://localhost:5173>
   RFID_BRIDGE_SECRET=<only needed if you plan to use RFID card login — shared secret with the rpi/ bridge>
```
4. Run migrations:
```bash
   npx prisma migrate dev
```
5. Seed the database (creates starter data and the initial administrator account):
```bash
   npx prisma db seed
```
6. Start the dev server:
```bash
   npm run dev
```
> The API runs on `http://localhost:3000` by default, and also upgrades `/ws/rfid` WebSocket connections on the same port (loopback only). Log in on the frontend using the login you defined via the seed (`admin@eduassets.com` by default) and the password set in `SEED_ADMIN_PASSWORD`.

### RFID Bridge (optional)
Only needed if you want physical card login. Run on the same machine as the backend (or a Raspberry Pi with network access to it):
1. Navigate to the `rpi/` directory and install dependencies:
```bash
   cd rpi
   pip install -r requirements.txt
```
2. Set the required environment variables (matching `RFID_BRIDGE_SECRET` on the backend):
```
   RFID_BRIDGE_SECRET=<same secret as the backend>
   EDUASSETS_BACKEND_URL=http://localhost:3000
   RFID_BACKEND=spi        # or "serial" to relay through an Arduino Nano
   RFID_SERIAL_PORT=/dev/ttyUSB0   # only used when RFID_BACKEND=serial
   RFID_SOUND_DEVICE=<optional ALSA device for audio feedback>
```
3. Run the bridge:
```bash
   python3 rfid_admin_bridge.py
```
> For unattended operation on a Raspberry Pi, install `eduassets-rfid.service` as a `systemd` unit and configure `/etc/eduassets/rfid-bridge.env` with the variables above. Use `provision_card.py <token>` to write a token (generated via Cadastros → Usuários in the app) onto a physical card.

---

## Author
Developed by Thiago da Silva.