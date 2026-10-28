# Roadmap — eduAssets

> **Official version 1.0.0 — October 28, 2026.** This page describes product scope and future directions; it is not a live infrastructure-availability dashboard.

## Version 1.0.0 — official

The official version brings together the TypeScript/Vite web frontend, Node.js/Express API, and PostgreSQL persistence through Prisma in separate repositories. The system supports equipment management, aggregate inventory, loans, returns, and occurrences, with Guest, Editor, and Administrator access, reports, and exports.

Authentication supports secure cookie sessions where available in the backend, Origin validation for authenticated mutations, controlled compatibility with legacy Bearer tokens, and a one-time-code exchange for RFID login. Guest Mode receives minimized server-side data projections; effective permissions are enforced by the API.

The product includes canonical bilingual documentation, an in-app reader, and a separate portfolio site. RFID remains optional and public deployment templates keep it disabled by default.

## Operations and architecture

The API is the authorization boundary; interface controls are usability measures. Administrator-timeout state is process-local, so the documented configuration assumes a single instance. Deployment, hosting, and recovery guides describe operational and database procedures. Version 1.0.0 is a product release status, not a real-time reading of hosted services.

## Future directions

Possible areas for future versions include serial-number tracking of physical units, password recovery, more granular access roles, functional notifications, periodic reports, and a mobile companion or QR alternative to RFID. A frontend migration to React may also be considered; the current client uses TypeScript with native DOM rendering.
