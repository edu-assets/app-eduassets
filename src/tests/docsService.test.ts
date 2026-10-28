import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/state/i18nStore.js', () => ({
    getIdioma: () => 'pt',
    t: (key: string) => key,
}));

vi.mock('../core/docs/markdownRenderer.js', () => ({
    renderizarMarkdown: async (markdown: string) => ({ html: `<p>${markdown}</p>`, headings: [] }),
}));

const PINNED_DOCS_BASE_URL = 'https://raw.githubusercontent.com/edu-assets/docs-eduassets/01945731ae917d313e4764586a490962bb4cfb94/public';

describe('documentation Markdown source', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('loads the pinned central release and ignores a mutable source override', async () => {
        vi.stubEnv('VITE_DOCS_BASE_URL', 'https://raw.githubusercontent.com/edu-assets/docs-eduassets/main/public');
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => '# Pinned central guide',
        });
        vi.stubGlobal('fetch', fetchMock);

        const { loadDocument } = await import('../core/docs/docsService.js');
        const document = await loadDocument('manual-usuario');

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledWith(`${PINNED_DOCS_BASE_URL}/docs/MANUAL_USUARIO.md`);
        expect(document.markdown).toBe('# Pinned central guide');
    });

    it('uses the immutable release URL by default', async () => {
        vi.stubEnv('VITE_DOCS_BASE_URL', '');
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => '# Pinned guide',
        });
        vi.stubGlobal('fetch', fetchMock);

        const { loadDocument } = await import('../core/docs/docsService.js');
        const document = await loadDocument('manual-usuario');

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledWith(`${PINNED_DOCS_BASE_URL}/docs/MANUAL_USUARIO.md`);
        expect(document.markdown).toBe('# Pinned guide');
    });

    it('uses the bundled same-origin Markdown only when the pinned source is unavailable', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 404, text: async () => '' })
            .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '# Local fallback' });
        vi.stubGlobal('fetch', fetchMock);

        const { loadDocument } = await import('../core/docs/docsService.js');
        const document = await loadDocument('manual-usuario');

        expect(fetchMock).toHaveBeenNthCalledWith(1, `${PINNED_DOCS_BASE_URL}/docs/MANUAL_USUARIO.md`);
        expect(fetchMock).toHaveBeenNthCalledWith(2, '/docs/MANUAL_USUARIO.md');
        expect(document.markdown).toBe('# Local fallback');
    });
});
