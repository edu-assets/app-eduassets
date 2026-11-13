import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/api/notificacoes.js', () => ({
    enviarNotificacaoTeste: vi.fn(),
    obterConfigPush: vi.fn(),
    removerInscricaoPush: vi.fn(),
    salvarInscricaoPush: vi.fn()
}));

import { obterConfigPush } from '../core/api/notificacoes.js';
import {
    ERRO_PERMISSAO_NEGADA,
    ERRO_PERMISSAO_SEM_RESPOSTA,
    ERRO_PUSH_INDISPONIVEL,
    ativar,
    lerPreferenciasLocais,
    normalizarPreferencias,
    urlBase64ToUint8Array
} from '../core/notifications/pushNotifications.js';

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

describe('ativar() permission results', () => {
    const permissao = { atual: 'default' as NotificationPermission, resultado: 'default' as NotificationPermission };

    beforeEach(() => {
        permissao.atual = 'default';
        permissao.resultado = 'default';
        vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', platform: 'Linux x86_64', maxTouchPoints: 0, serviceWorker: {} });
        vi.stubGlobal('window', { PushManager: {}, matchMedia: () => ({ matches: false }) });
        vi.stubGlobal('Notification', {
            get permission() { return permissao.atual; },
            requestPermission: vi.fn(async () => {
                permissao.atual = permissao.resultado;
                return permissao.resultado;
            })
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it("maps 'default' (no popup shown, e.g. Chrome's quiet UI) to notif.erro_permissao_sem_resposta", async () => {
        permissao.resultado = 'default';
        await expect(ativar()).rejects.toThrow(ERRO_PERMISSAO_SEM_RESPOSTA);
        expect(ERRO_PERMISSAO_SEM_RESPOSTA).toBe('notif.erro_permissao_sem_resposta');
        expect(Notification.requestPermission).toHaveBeenCalledTimes(1);
    });

    it("maps 'denied' to the existing notif.erro_permissao", async () => {
        permissao.resultado = 'denied';
        await expect(ativar()).rejects.toThrow(ERRO_PERMISSAO_NEGADA);
        expect(ERRO_PERMISSAO_NEGADA).toBe('notif.erro_permissao');
    });

    it('does not ask again when the permission is already blocked', async () => {
        permissao.atual = 'denied';
        await expect(ativar()).rejects.toThrow(ERRO_PERMISSAO_NEGADA);
        expect(Notification.requestPermission).not.toHaveBeenCalled();
    });

    it("continues to the server config after 'granted'", async () => {
        permissao.resultado = 'granted';
        vi.mocked(obterConfigPush).mockResolvedValueOnce({ habilitado: false, chavePublica: null });
        await expect(ativar()).rejects.toThrow(ERRO_PUSH_INDISPONIVEL);
        expect(obterConfigPush).toHaveBeenCalledTimes(1);
    });
});
