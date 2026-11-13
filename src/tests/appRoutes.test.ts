import { describe, expect, it } from 'vitest';
import {
    HASHES_APP_CONHECIDOS,
    ROTAS,
    ehHashApp,
    parseRota,
    rotaDoPainel,
    serializarRota,
} from '../core/layout/appRoutes.js';
import pt from '../core/i18n/pt.json';
import en from '../core/i18n/en.json';

describe('app routes', () => {
    it('has one unique slug per panel and translated titles in both languages', () => {
        const slugs = ROTAS.map((rota) => rota.slug);
        const paineis = ROTAS.map((rota) => rota.painelId);
        expect(new Set(slugs).size).toBe(slugs.length);
        expect(new Set(paineis).size).toBe(paineis.length);
        for (const rota of ROTAS) {
            expect(pt).toHaveProperty([rota.tituloChave]);
            expect(en).toHaveProperty([rota.tituloChave]);
        }
        expect(rotaDoPainel('panel-devolucao')?.slug).toBe('devolucoes');
        expect(rotaDoPainel('panel-config')?.slug).toBe('configuracoes');
        expect(rotaDoPainel('panel-404')).toBeNull();
    });

    it('serializes and parses every route back to itself', () => {
        for (const rota of ROTAS) {
            const hash = serializarRota({ slug: rota.slug });
            expect(hash).toBe(`#app/${rota.slug}`);
            expect(parseRota(hash)).toEqual({ slug: rota.slug, desconhecida: false });
        }
        expect(serializarRota({ slug: 'dashboard', aba: 'historico' })).toBe('#app/dashboard/historico');
        expect(parseRota('#app/dashboard/historico')).toEqual({ slug: 'dashboard', aba: 'historico', desconhecida: false });
        // Tabs only exist on the dashboard.
        expect(serializarRota({ slug: 'controle', aba: 'historico' })).toBe('#app/controle');
    });

    it('opens the home panel for bare #app and flags unknown slugs or tabs', () => {
        expect(parseRota('#app')).toEqual({ slug: 'inicio', desconhecida: false });
        expect(parseRota('#app/')).toEqual({ slug: 'inicio', desconhecida: false });
        expect(parseRota('#app/nao-existe')).toEqual({ slug: 'inicio', desconhecida: true });
        expect(parseRota('#app/dashboard/xyz')).toEqual({ slug: 'dashboard', desconhecida: true });
        expect(parseRota('#app/sobre/a/b')).toEqual({ slug: 'inicio', desconhecida: true });
    });

    it('ignores hashes outside the app shell', () => {
        expect(parseRota('')).toBeNull();
        expect(parseRota('#login')).toBeNull();
        expect(parseRota('#termos')).toBeNull();
        expect(parseRota('#application')).toBeNull();
        expect(parseRota('#redefinir-senha=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCd')).toBeNull();
        expect(ehHashApp('#app/devolucoes')).toBe(true);
        expect(ehHashApp('#apps')).toBe(false);
    });

    it('lists a fixed set of known hashes for reporting', () => {
        expect(HASHES_APP_CONHECIDOS.has('#app')).toBe(true);
        expect(HASHES_APP_CONHECIDOS.has('#app/devolucoes')).toBe(true);
        expect(HASHES_APP_CONHECIDOS.has('#app/dashboard/historico')).toBe(true);
        expect(HASHES_APP_CONHECIDOS.has('#app/nao-existe')).toBe(false);
        expect(HASHES_APP_CONHECIDOS.size).toBe(ROTAS.length + 1 + 2);
    });
});
