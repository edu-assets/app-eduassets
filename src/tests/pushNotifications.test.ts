import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/api/notificacoes.js', () => ({
    enviarNotificacaoTeste: vi.fn(),
    obterConfigPush: vi.fn(),
    removerInscricaoPush: vi.fn(),
    salvarInscricaoPush: vi.fn()
}));

import { lerPreferenciasLocais, normalizarPreferencias, urlBase64ToUint8Array } from '../core/notifications/pushNotifications.js';

describe('urlBase64ToUint8Array', () => {
    it('decodes base64url without padding', () => {
        // "Hello" => SGVsbG8 (base64url, unpadded)
        expect(Array.from(urlBase64ToUint8Array('SGVsbG8'))).toEqual([72, 101, 108, 108, 111]);
    });

    it('translates the URL-safe alphabet (- and _) back to + and /', () => {
        // bytes 0xfb 0xff 0xbf => "-_-_" in base64url ("+/+/" in base64)
        expect(Array.from(urlBase64ToUint8Array('-_-_'))).toEqual([0xfb, 0xff, 0xbf]);
    });

    it('handles inputs that need one and two padding characters', () => {
        expect(Array.from(urlBase64ToUint8Array('TWE'))).toEqual([77, 97]); // "Ma"
        expect(Array.from(urlBase64ToUint8Array('TQ'))).toEqual([77]); // "M"
    });

    it('decodes a 65-byte VAPID-sized key', () => {
        const bytes = Uint8Array.from({ length: 65 }, (_, i) => (i * 7 + 4) % 256);
        const base64Url = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
        const decoded = urlBase64ToUint8Array(base64Url);
        expect(decoded).toBeInstanceOf(Uint8Array);
        expect(decoded.length).toBe(65);
        expect(Array.from(decoded)).toEqual(Array.from(bytes));
    });
});

describe('push preferences', () => {
    const store = new Map<string, string>();

    beforeEach(() => {
        store.clear();
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => { store.set(key, value); },
            removeItem: (key: string) => { store.delete(key); }
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('defaults every preference to on', () => {
        expect(lerPreferenciasLocais()).toEqual({ emprestimo: true, devolucao: true, ocorrencia: true });
    });

    it('reads stored preferences and ignores malformed values', () => {
        store.set('eduassets_push_prefs', JSON.stringify({ emprestimo: false, devolucao: 'x', ocorrencia: false }));
        expect(lerPreferenciasLocais()).toEqual({ emprestimo: false, devolucao: true, ocorrencia: false });
        store.set('eduassets_push_prefs', '{not json');
        expect(lerPreferenciasLocais()).toEqual({ emprestimo: true, devolucao: true, ocorrencia: true });
    });

    it('falls back to defaults when storage throws', () => {
        vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); } });
        expect(lerPreferenciasLocais()).toEqual({ emprestimo: true, devolucao: true, ocorrencia: true });
    });

    it('normalizes arbitrary input', () => {
        expect(normalizarPreferencias(null)).toEqual({ emprestimo: true, devolucao: true, ocorrencia: true });
        expect(normalizarPreferencias({ devolucao: false })).toEqual({ emprestimo: true, devolucao: false, ocorrencia: true });
    });
});
