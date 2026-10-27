import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/state/i18nStore.js', () => ({
    getIdioma: () => 'pt',
    t: (key: string) => key,
}));

vi.mock('../core/docs/markdownRenderer.js', () => ({
    renderizarMarkdown: async (markdown: string) => ({ html: `<p>${markdown}</p>`, headings: [] }),
}));

describe('documentation Markdown source', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('loads from the configured central repository when it is available', async () => {
        vi.stubEnv('VITE_DOCS_BASE_URL', 'https://raw.githubusercontent.com/edu-assets/docs-eduassets/main/public/');
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => '# Central guide',
        });
        vi.stubGlobal('fetch', fetchMock);

        const { loadDocument } = await import('../core/docs/docsService.js');
        const document = await loadDocument('manual-usuario');

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledWith(
            'https://raw.githubusercontent.com/edu-assets/docs-eduassets/main/public/docs/MANUAL_USUARIO.md',
        );
        expect(document.markdown).toBe('# Central guide');
    });

    it('falls back to the bundled same-origin Markdown when the central source is unavailable', async () => {
        vi.stubEnv('VITE_DOCS_BASE_URL', 'https://raw.githubusercontent.com/edu-assets/docs-eduassets/main/public');
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 404, text: async () => '' })
            .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '# Local fallback' });
        vi.stubGlobal('fetch', fetchMock);

        const { loadDocument } = await import('../core/docs/docsService.js');
        const document = await loadDocument('manual-usuario');

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            'https://raw.githubusercontent.com/edu-assets/docs-eduassets/main/public/docs/MANUAL_USUARIO.md',
        );
        expect(fetchMock).toHaveBeenNthCalledWith(2, '/docs/MANUAL_USUARIO.md');
        expect(document.markdown).toBe('# Local fallback');
    });
});
