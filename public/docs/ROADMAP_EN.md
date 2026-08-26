# Roadmap — eduAssets

## Toward v1.0.0 (short term)

- [ ] Automated tests with Vitest for critical business logic (stock, item validation) — setup already started in v0.9.9.
- [ ] Proper CORS configuration for production (currently permissive by default when `CORS_ORIGIN` isn't set).
- [ ] End-to-end testing of the RFID flow directly on the Raspberry Pi 5 hardware.
- [ ] Final Nginx tuning: gzip/brotli compression, cache headers, HTTP/2.
- [ ] First public deployment (frontend on Vercel, backend on Render).

## v1.0.0 — Stable release
Stability milestone: all essential features complete, tested, and documented; no pending structural changes.

## Post-1.0 (v2 — medium/long term)

- [ ] Full migration of the frontend to TypeScript + React, reusing the existing `core`/`features`/`shared` layers.
- [ ] Individual serial-number tracking (today control is by aggregated quantity, not by physical unit).
- [ ] Password recovery ("Forgot my password") — currently only an authenticated change is possible via the Security panel.
- [ ] More granular permissions (per panel/action), beyond the current two levels (Administrator/Editor).
- [ ] A theme picker beyond Light/Dark/System (the token structure already supports multiple themes).
- [ ] Real notifications (today the Settings interface is visual only).

## Ideas under consideration (no committed timeline)

- Scheduled reports (automatic periodic export by email).
- Mobile companion app for QR-code scanning as an alternative to RFID.
