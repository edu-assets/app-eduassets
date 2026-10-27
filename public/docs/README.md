# eduAssets frontend documentation

[Português](LEIAME.md) · [Documentation repository](https://github.com/edu-assets/docs-eduassets) · [Frontend source](https://github.com/edu-assets/app-eduassets)

This is the English entry point for the eduAssets browser-application guides. The frontend source code is maintained in `edu-assets/app-eduassets`; the API is in `edu-assets/eduAssets`; the canonical bilingual documentation is maintained in `edu-assets/docs-eduassets`.

## Guides

- [User manual](USER_MANUAL.md)
- [Architecture](ARCHITECTURE.md)
- [Data model](DATA_MODEL.md)
- [API reference](API_REFERENCE.md)
- [Development](DEVELOPMENT.md)
- [Deployment](DEPLOYMENT.md) · [Hosting and operations](Hosting.md)
- [Operations and recovery](OPERATIONS_AND_RECOVERY.md)
- [Changelog](CHANGELOG_EN.md) · [Roadmap](ROADMAP_EN.md)

The app's About panel keeps its catalog, search, table of contents, and Markdown renderer in the frontend repository. It can load these files from the central repository when `VITE_DOCS_BASE_URL` is configured and the content is publicly reachable; otherwise it uses the bundled same-origin fallback.
