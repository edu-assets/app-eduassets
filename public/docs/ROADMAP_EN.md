# Roadmap — eduAssets

> **Official version 1.2.0 — November 12, 2026.** This page describes product scope and future directions; it is not a live infrastructure-availability dashboard.

## Version 1.2.0 — official

Official version 1.2.0 extends the 1.0.x scope with administrator password reset in the interface, self-service email password recovery, network-resilient logout and continuous operation (monitoring with HTTP 5xx alerting, scheduled backup with retention, a restore drill and automatic API deployment after CI), while keeping the 1.0.1 security remediation and the 1.0.2 interface fixes recorded in the changelog. It brings together the TypeScript/Vite web frontend, Node.js/Express API, and PostgreSQL persistence through Prisma in separate repositories. The system supports equipment management, aggregate inventory, loans, returns, and occurrences, with Guest, Editor, and Administrator access, reports, and exports.

The browser uses secure cookie-only sessions; if support cannot be confirmed, login fails closed and no JWT is persisted in `localStorage`. The backend validates Origin on authenticated mutations and may retain Bearer compatibility for legacy non-browser clients. Browser RFID login exchanges a one-time code for a session cookie. Guest Mode receives minimized server-side data projections; effective permissions are enforced by the API.

The product includes canonical bilingual documentation, an in-app reader, and a separate portfolio site. RFID remains optional and public deployment templates keep it disabled by default.

## Operations and architecture

The API is the authorization boundary; interface controls are usability measures. Administrator-timeout state is process-local, so the documented configuration assumes a single instance. Deployment, hosting, and recovery guides describe operational and database procedures. Version 1.2.0 is a product release status, not a real-time reading of hosted services.

## Future directions

Possible areas for future versions include serial-number tracking of physical units, more granular access roles, functional notifications, periodic reports, and a mobile companion or QR alternative to RFID. A frontend migration to React may also be considered; the current client uses TypeScript with native DOM rendering.
