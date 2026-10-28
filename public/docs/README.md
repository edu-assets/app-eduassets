# eduAssets frontend documentation

[Português](LEIAME.md) · [Documentation repository](https://github.com/edu-assets/docs-eduassets) · [Frontend source](https://github.com/edu-assets/app-eduassets)

This is the English entry point for the eduAssets browser-application guides. The frontend source code is maintained in `edu-assets/app-eduassets`; the API is in `edu-assets/api-eduassets`; the canonical bilingual documentation is maintained in `edu-assets/docs-eduassets`.

## Guides

- [User manual](USER_MANUAL.md)
- [Architecture](ARCHITECTURE.md)
- [Data model](DATA_MODEL.md)
- [API reference](API_REFERENCE.md)
- [Development](DEVELOPMENT.md)
- [Deployment](DEPLOYMENT.md) · [Hosting and operations](Hosting.md)
- [Operations and recovery](OPERATIONS_AND_RECOVERY.md)
- [Changelog](CHANGELOG_EN.md) · [Roadmap](ROADMAP_EN.md)

The app's About panel keeps its catalog, search, table of contents, and renderer in the frontend repository. It fetches modal Markdown from an immutable documentation commit pinned in `src/core/docs/docsService.ts` via `raw.githubusercontent.com`; it does not use `VITE_DOCS_BASE_URL`. If the pinned request fails or returns a non-success status, the app uses the bundled same-origin fallback. The public guide site remains available at https://docs.eduassets.tech.
