import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/api/notificacoes.js', () => ({
    enviarNotificacaoTeste: vi.fn(),
    obterConfigPush: vi.fn(),
    removerInscricaoPush: vi.fn(async () => undefined),
    salvarInscricaoPush: vi.fn(async (_inscricao: unknown, preferencias: unknown) => ({ preferencias }))
}));

import { obterConfigPush, removerInscricaoPush, salvarInscricaoPush } from '../core/api/notificacoes.js';

type Modulo = typeof import('../core/notifications/pushNotifications.js');

/** A VAPID-shaped public key: 65 bytes, uncompressed point marker 0x04 first. */
const CHAVE_BYTES = Uint8Array.from({ length: 65 }, (_, i) => (i === 0 ? 4 : (i * 13 + 1) % 256));
const paraBase64Url = (bytes: Uint8Array): string =>
    btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const CHAVE = paraBase64Url(CHAVE_BYTES);
const OUTRA_CHAVE_BYTES = Uint8Array.from({ length: 65 }, (_, i) => (i === 0 ? 4 : 9));

const erroDoNavegador = (nome: string, mensagem = 'Registration failed - push service error'): DOMException =>
    new DOMException(mensagem, nome);

function criarInscricao(chave: Uint8Array = CHAVE_BYTES) {
    return {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        options: { applicationServerKey: chave.slice().buffer, userVisibleOnly: true },
        toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) } }),
        unsubscribe: vi.fn(async () => true)
    };
}

type Inscricao = ReturnType<typeof criarInscricao>;

const estado = {
    permissao: 'granted' as NotificationPermission,
    atual: null as Inscricao | null
};

const pushManager = {
    getSubscription: vi.fn(async () => estado.atual),
    subscribe: vi.fn(async (_opcoes: PushSubscriptionOptionsInit) => {
        estado.atual = criarInscricao();
        return estado.atual;
    })
};

const registro = { pushManager };

function instalarAmbiente(extras: Record<string, unknown> = {}): void {
    vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/131.0 Mobile',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
        serviceWorker: {
            register: vi.fn(async () => registro),
            ready: Promise.resolve(registro)
        },
        ...extras
    });
    vi.stubGlobal('window', { PushManager: {}, matchMedia: () => ({ matches: false }), dispatchEvent: vi.fn() });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    vi.stubGlobal('Notification', {
        get permission() { return estado.permissao; },
        requestPermission: vi.fn(async () => estado.permissao)
    });
}

describe('push subscription (concluirAtivacao)', () => {
    let m: Modulo;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        estado.permissao = 'granted';
        estado.atual = null;
        pushManager.getSubscription.mockImplementation(async () => estado.atual);
        pushManager.subscribe.mockImplementation(async () => {
            estado.atual = criarInscricao();
            return estado.atual;
        });
        vi.mocked(obterConfigPush).mockResolvedValue({ habilitado: true, chavePublica: CHAVE });
        instalarAmbiente();
        m = await import('../core/notifications/pushNotifications.js');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('subscribes with the decoded VAPID key and registers the subscription on the server', async () => {
        await expect(m.concluirAtivacao()).resolves.toEqual({ emprestimo: true, devolucao: true, ocorrencia: true });
        expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
        const opcoes = pushManager.subscribe.mock.calls[0][0];
        expect(opcoes.userVisibleOnly).toBe(true);
        expect(Array.from(opcoes.applicationServerKey as Uint8Array)).toEqual(Array.from(CHAVE_BYTES));
        expect(salvarInscricaoPush).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes a subscription created with another VAPID key before subscribing', async () => {
        const antiga = criarInscricao(OUTRA_CHAVE_BYTES);
        estado.atual = antiga;
        pushManager.getSubscription.mockResolvedValueOnce(antiga);
        await m.concluirAtivacao();
        expect(antiga.unsubscribe).toHaveBeenCalledTimes(1);
        expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    });

    it('reuses an existing subscription made with the same key (no subscribe call)', async () => {
        estado.atual = criarInscricao();
        await m.concluirAtivacao();
        expect(pushManager.subscribe).not.toHaveBeenCalled();
        expect(salvarInscricaoPush).toHaveBeenCalledTimes(1);
    });

    it('fails (and frees the single-flight) when subscribe() never settles', async () => {
        vi.useFakeTimers();
        pushManager.subscribe.mockImplementationOnce(() => new Promise<never>(() => undefined));
        const resultado = m.concluirAtivacao();
        const verificacao = expect(resultado).rejects.toThrow(m.ERRO_SERVICO_PUSH);
        await vi.advanceTimersByTimeAsync(m.LIMITE_ATIVACAO_MS);
        await verificacao;
        // A new attempt starts a new run instead of sharing the hung one.
        const nova = m.concluirAtivacao();
        expect(nova).not.toBe(resultado);
        await expect(nova).resolves.toBeDefined();
    });

    it('recovers from "push service error": drops the stale subscription, waits and retries once', async () => {
        vi.useFakeTimers();
        const restante = criarInscricao();
        pushManager.subscribe
            .mockImplementationOnce(async () => {
                estado.atual = restante;
                throw erroDoNavegador('AbortError');
            });
        const resultado = m.concluirAtivacao();
        await vi.advanceTimersByTimeAsync(m.ESPERA_NOVA_TENTATIVA_MS);
        await expect(resultado).resolves.toBeDefined();
        expect(restante.unsubscribe).toHaveBeenCalledTimes(1);
        expect(pushManager.subscribe).toHaveBeenCalledTimes(2);
        expect(salvarInscricaoPush).toHaveBeenCalledTimes(1);
    });

    it('gives up after one retry with a translated key (never the raw browser message, never a loop)', async () => {
        vi.useFakeTimers();
        pushManager.subscribe.mockImplementation(async () => { throw erroDoNavegador('AbortError'); });
        const resultado = m.concluirAtivacao();
        const verificacao = expect(resultado).rejects.toThrow(m.ERRO_SERVICO_PUSH);
        await vi.advanceTimersByTimeAsync(m.ESPERA_NOVA_TENTATIVA_MS * 4);
        await verificacao;
        expect(pushManager.subscribe).toHaveBeenCalledTimes(2);
        expect(salvarInscricaoPush).not.toHaveBeenCalled();
    });

    it('maps a rejected key (InvalidAccessError) without retrying', async () => {
        pushManager.subscribe.mockImplementation(async () => {
            throw erroDoNavegador('InvalidAccessError', 'The provided applicationServerKey is not valid.');
        });
        await expect(m.concluirAtivacao()).rejects.toThrow(m.ERRO_CHAVE_PUSH);
        expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    });

    it('rejects a malformed server key before calling subscribe', async () => {
        vi.mocked(obterConfigPush).mockResolvedValue({ habilitado: true, chavePublica: paraBase64Url(CHAVE_BYTES.slice(0, 32)) });
        await expect(m.concluirAtivacao()).rejects.toThrow(m.ERRO_CHAVE_PUSH);
        vi.mocked(obterConfigPush).mockResolvedValue({ habilitado: true, chavePublica: '%%%not-base64%%%' });
        await expect(m.concluirAtivacao()).rejects.toThrow(m.ERRO_CHAVE_PUSH);
        expect(pushManager.subscribe).not.toHaveBeenCalled();
    });

    it('is single-flight: concurrent callers share one subscribe() call', async () => {
        let liberar: () => void = () => undefined;
        pushManager.subscribe.mockImplementationOnce(() => new Promise((resolve) => {
            liberar = () => { estado.atual = criarInscricao(); resolve(estado.atual); };
        }));
        const a = m.concluirAtivacao();
        const b = m.concluirAtivacao();
        expect(a).toBe(b);
        await vi.waitFor(() => expect(pushManager.subscribe).toHaveBeenCalledTimes(1));
        liberar();
        await Promise.all([a, b]);
        expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
        expect(salvarInscricaoPush).toHaveBeenCalledTimes(1);
    });

    it('holds a cross-tab Web Lock while subscribing when the API exists', async () => {
        const request = vi.fn((_nome: string, _opcoes: unknown, tarefa: () => Promise<unknown>) => tarefa());
        instalarAmbiente({ locks: { request } });
        await m.concluirAtivacao();
        expect(request).toHaveBeenCalledTimes(1);
        expect(request.mock.calls[0][0]).toBe('eduassets-push-inscricao');
    });

    it('state reads wait for the activation in progress', async () => {
        let liberar: () => void = () => undefined;
        pushManager.subscribe.mockImplementationOnce(() => new Promise((resolve) => {
            liberar = () => { estado.atual = criarInscricao(); resolve(estado.atual); };
        }));
        const ativacao = m.concluirAtivacao();
        await vi.waitFor(() => expect(pushManager.subscribe).toHaveBeenCalledTimes(1));
        const leitura = m.obterEstadoPush();
        liberar();
        await ativacao;
        await expect(leitura).resolves.toMatchObject({ inscrito: true });
    });

    it('ativar() does not prompt again when the permission is already granted', async () => {
        await m.ativar();
        expect(Notification.requestPermission).not.toHaveBeenCalled();
        expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    });

    it('sincronizar() drops a subscription made with an older VAPID key instead of re-binding it', async () => {
        const antiga = criarInscricao(OUTRA_CHAVE_BYTES);
        estado.atual = antiga;
        await m.sincronizar();
        expect(antiga.unsubscribe).toHaveBeenCalledTimes(1);
        expect(removerInscricaoPush).toHaveBeenCalledWith(antiga.endpoint);
        expect(salvarInscricaoPush).not.toHaveBeenCalled();
    });

    it('sincronizar() re-binds a subscription made with the current key', async () => {
        estado.atual = criarInscricao();
        await m.sincronizar();
        expect(salvarInscricaoPush).toHaveBeenCalledTimes(1);
    });
});

describe('pedirPermissao()', () => {
    let m: Modulo;
    const permissao = { atual: 'default' as NotificationPermission };

    beforeEach(async () => {
        vi.resetModules();
        permissao.atual = 'default';
        vi.useFakeTimers();
        m = await import('../core/notifications/pushNotifications.js');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('supports the legacy callback-only form (returns undefined)', async () => {
        vi.stubGlobal('Notification', {
            get permission() { return permissao.atual; },
            requestPermission: vi.fn((callback: (p: NotificationPermission) => void) => {
                setTimeout(() => { permissao.atual = 'granted'; callback('granted'); }, 100);
                return undefined;
            })
        });
        const resultado = m.pedirPermissao();
        await vi.advanceTimersByTimeAsync(100);
        await expect(resultado).resolves.toBe('granted');
    });

    it('settles from Notification.permission when the browser never settles its promise', async () => {
        vi.stubGlobal('Notification', {
            get permission() { return permissao.atual; },
            requestPermission: vi.fn(() => new Promise<NotificationPermission>(() => undefined))
        });
        const resultado = m.pedirPermissao();
        await vi.advanceTimersByTimeAsync(3000);
        permissao.atual = 'granted';
        await vi.advanceTimersByTimeAsync(1000);
        await expect(resultado).resolves.toBe('granted');
    });

    it("gives up with 'default' after the limit so the activation is never stuck", async () => {
        vi.stubGlobal('Notification', {
            get permission() { return permissao.atual; },
            requestPermission: vi.fn(() => new Promise<NotificationPermission>(() => undefined))
        });
        const resultado = m.pedirPermissao();
        await vi.advanceTimersByTimeAsync(m.LIMITE_PEDIDO_PERMISSAO_MS);
        await expect(resultado).resolves.toBe('default');
    });

    it('asks synchronously (inside the user gesture) and resolves once', async () => {
        const requestPermission = vi.fn(async (callback?: (p: NotificationPermission) => void) => {
            permissao.atual = 'denied';
            callback?.('denied');
            return 'denied' as NotificationPermission;
        });
        vi.stubGlobal('Notification', { get permission() { return permissao.atual; }, requestPermission });
        const resultado = m.pedirPermissao();
        expect(requestPermission).toHaveBeenCalledTimes(1);
        await expect(resultado).resolves.toBe('denied');
    });
});

describe('erroDoNavegadorParaChave()', () => {
    let m: Modulo;

    beforeEach(async () => {
        vi.resetModules();
        m = await import('../core/notifications/pushNotifications.js');
    });

    afterEach(() => vi.unstubAllGlobals());

    it('maps DOMException names to i18n keys', () => {
        vi.stubGlobal('Notification', { permission: 'granted' });
        expect(m.erroDoNavegadorParaChave(erroDoNavegador('AbortError'))).toBe('notif.erro_servico_push');
        expect(m.erroDoNavegadorParaChave(erroDoNavegador('InvalidStateError'))).toBe('notif.erro_servico_push');
        expect(m.erroDoNavegadorParaChave(erroDoNavegador('InvalidAccessError'))).toBe('notif.erro_chave_push');
        expect(m.erroDoNavegadorParaChave(erroDoNavegador('NotSupportedError'))).toBe('notif.erro_nao_suportado');
        expect(m.erroDoNavegadorParaChave(erroDoNavegador('NotAllowedError'))).toBe('notif.erro_servico_push');
        expect(m.erroDoNavegadorParaChave(new Error('x'))).toBe('notif.erro_servico_push');
        vi.stubGlobal('Notification', { permission: 'denied' });
        expect(m.erroDoNavegadorParaChave(erroDoNavegador('NotAllowedError'))).toBe('notif.erro_permissao');
        vi.stubGlobal('Notification', { permission: 'default' });
        expect(m.erroDoNavegadorParaChave(erroDoNavegador('NotAllowedError'))).toBe('notif.erro_permissao_sem_resposta');
    });
});

describe('i18n keys for push errors', () => {
    it('exist in both languages', async () => {
        const pt = (await import('../core/i18n/pt.json')).default as Record<string, string>;
        const en = (await import('../core/i18n/en.json')).default as Record<string, string>;
        for (const chave of ['notif.erro_servico_push', 'notif.erro_chave_push', 'notif.erro_permissao_sem_resposta']) {
            expect(pt[chave]).toBeTruthy();
            expect(en[chave]).toBeTruthy();
        }
    });
});
