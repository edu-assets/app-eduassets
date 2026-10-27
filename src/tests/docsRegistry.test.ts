import { describe, expect, it, vi } from 'vitest';

vi.mock('../core/state/i18nStore.js', () => ({
    getIdioma: () => 'pt',
    t: (key: string) => key,
}));

import { getDocsRegistry } from '../core/docs/registry.js';
import { renderAboutDocTiles } from '../features/sobre/documentationTemplates.js';

describe('documentation registry and About links', () => {
    it('has unique ids and localized Markdown paths in Portuguese and English', () => {
        for (const language of ['pt', 'en'] as const) {
            const ids = new Set<string>();
            const documents = getDocsRegistry(language);
            expect(documents.length).toBeGreaterThan(0);

            for (const document of documents) {
                expect(ids.has(document.id)).toBe(false);
                ids.add(document.id);
                expect(document.title.trim()).not.toBe('');
                expect(document.file).toMatch(/^\/docs\/.+\.md$/);
            }
            expect(ids.size).toBe(documents.length);
        }
    });

    it('renders every registered document in the About grid in both languages', () => {
        for (const language of ['pt', 'en'] as const) {
            const documents = getDocsRegistry(language);
            const html = renderAboutDocTiles(documents);

            expect((html.match(/data-abrir-doc=/g) ?? []).length).toBe(documents.length);
            for (const document of documents) {
                expect(html).toContain(`data-abrir-doc="${document.id}"`);
                expect(html).toContain(document.title);
            }
        }
    });
});
