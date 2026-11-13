/**
 * Product version. Single import point for code: the value is injected at build time from the `version`
 * field of app/package.json (vite.config.ts `define`), which `npm run version:set` keeps in sync with the
 * api, docs and site repositories.
 */
export const APP_VERSION: string = __APP_VERSION__;
