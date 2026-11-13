// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    isAdmin: vi.fn(() => true),
    servidorPush: vi.fn(async () => true),
    showToast: vi.fn(),
    ativar: vi.fn(async () => ({ emprestimo: true, devolucao: true, ocorrencia: true })),
    concluirAtivacao: vi.fn(async () => ({ emprestimo: true, devolucao: true, ocorrencia: true })),
    obterEstadoPush: vi.fn(async () => ({
        suporte: 'suportado',
        inscrito: false,
        preferencias: { emprestimo: true, devolucao: true, ocorrencia: true }
    })),
    authListener: null as null | ((estado: { autenticado: boolean }) => void)
}));

vi.mock('../core/auth/permissions.js', () => ({ isAdmin: mocks.isAdmin }));
vi.mock('../core/api/notificacoes.js', () => ({ pushDisponivelNoServidor: mocks.servidorPush }));
vi.mock('../core/ui/toast.js', () => ({ showToast: mocks.showToast }));
vi.mock('../core/state/authStore.js', () => ({
    subscribe: (callback: (estado: { autenticado: boolean }) => void) => { mocks.authListener = callback; return () => undefined; }
}));
vi.mock('../core/state/i18nStore.js', () => ({
    t: (chave: string) => chave,
    traduzirErro: (erro: unknown, fallback: string) => (erro instanceof Error ? erro.message : fallback)
}));
vi.mock('../core/notifications/pushNotifications.js', () => ({
    ERRO_PERMISSAO_NEGADA: 'notif.erro_permissao',
    ERRO_PERMISSAO_SEM_RESPOSTA: 'notif.erro_permissao_sem_resposta',
    ativar: mocks.ativar,
    concluirAtivacao: mocks.concluirAtivacao,
    obterEstadoPush: mocks.obterEstadoPush
}));

type Modulo = typeof import('../core/notifications/pushActivation.js');

const permissao = { atual: 'default' as NotificationPermission };

class StatusPermissao extends EventTarget {
    state = 'prompt';
}

function definirPermissions(valor: unknown): void {
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: valor });
}

const esvaziar = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function concederNoNavegador(): void {
    permissao.atual = 'granted';
}

describe('push activation and permission watcher', () => {
    let m: Modulo;
    let status: StatusPermissao;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();
        mocks.isAdmin.mockReturnValue(true);
        mocks.servidorPush.mockResolvedValue(true);
        mocks.ativar.mockResolvedValue({ emprestimo: true, devolucao: true, ocorrencia: true });
        mocks.obterEstadoPush.mockResolvedValue({
            suporte: 'suportado',
            inscrito: false,
            preferencias: { emprestimo: true, devolucao: true, ocorrencia: true }
        });
        permissao.atual = 'default';
        vi.stubGlobal('Notification', { get permission() { return permissao.atual; } });
        status = new StatusPermissao();
        definirPermissions({ query: vi.fn(async () => status) });
        m = await import('../core/notifications/pushActivation.js');
    });

    afterEach(() => {
        m.encerrarAtivacaoPush();
        vi.unstubAllGlobals();
        definirPermissions(undefined);
    });

    it("shows a long warning toast and arms the watcher when the browser answers 'default'", async () => {
        mocks.ativar.mockRejectedValueOnce(new Error('notif.erro_permissao_sem_resposta'));
        const eventos = vi.fn();
        window.addEventListener(m.EVENTO_ESTADO_PUSH, eventos);

        await expect(m.solicitarAtivacao()).resolves.toBe(false);

        expect(mocks.showToast).toHaveBeenCalledWith('notif.erro_permissao_sem_resposta', 'warning', m.DURACAO_ORIENTACAO_MS);
        expect(m.DURACAO_ORIENTACAO_MS).toBeGreaterThanOrEqual(10000);
        expect(m.orientacaoDePermissao()).toBe('notif.erro_permissao_sem_resposta');
        expect(m.observandoPermissao()).toBe(true);
        expect(eventos).toHaveBeenCalled();
        window.removeEventListener(m.EVENTO_ESTADO_PUSH, eventos);
    });

    it('shows the blocked guidance for a denied permission and keeps watching', async () => {
        mocks.ativar.mockRejectedValueOnce(new Error('notif.erro_permissao'));
        await m.solicitarAtivacao();
        expect(mocks.showToast).toHaveBeenCalledWith('notif.erro_permissao', 'warning', m.DURACAO_ORIENTACAO_MS);
        expect(m.observandoPermissao()).toBe(true);
    });

    it('uses a normal error toast (and no watcher) for unrelated failures', async () => {
        mocks.ativar.mockRejectedValueOnce(new Error('notif.erro_indisponivel'));
        await m.solicitarAtivacao();
        expect(mocks.showToast).toHaveBeenCalledWith('notif.erro_indisponivel', 'error');
        expect(m.observandoPermissao()).toBe(false);
    });

    it('reports success with the regular toast and no watcher', async () => {
        await expect(m.solicitarAtivacao()).resolves.toBe(true);
        expect(mocks.showToast).toHaveBeenCalledWith('notif.ativadas_ok', 'success');
        expect(m.observandoPermissao()).toBe(false);
    });

    it('auto-activates when the permission becomes granted (Permissions API change) after the user asked', async () => {
        mocks.ativar.mockRejectedValueOnce(new Error('notif.erro_permissao_sem_resposta'));
        await m.solicitarAtivacao();
        await esvaziar();
        const eventos = vi.fn();
        window.addEventListener(m.EVENTO_ESTADO_PUSH, eventos);

        concederNoNavegador();
        status.state = 'granted';
        status.dispatchEvent(new Event('change'));
        await vi.waitFor(() => expect(mocks.concluirAtivacao).toHaveBeenCalledTimes(1));
        await vi.waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith('notif.ativado_automaticamente', 'success'));

        expect(mocks.ativar).toHaveBeenCalledTimes(1); // no second permission prompt
        expect(m.observandoPermissao()).toBe(false);
        expect(m.orientacaoDePermissao()).toBeNull();
        await vi.waitFor(() => expect(eventos).toHaveBeenCalled());
        window.removeEventListener(m.EVENTO_ESTADO_PUSH, eventos);
    });

    it('falls back to the focus event when the Permissions API is missing', async () => {
        definirPermissions(undefined);
        mocks.ativar.mockRejectedValueOnce(new Error('notif.erro_permissao_sem_resposta'));
        await m.solicitarAtivacao();

        concederNoNavegador();
        window.dispatchEvent(new Event('focus'));
        await vi.waitFor(() => expect(mocks.concluirAtivacao).toHaveBeenCalledTimes(1));
    });

    it('falls back to visibilitychange when the Permissions API query rejects', async () => {
        definirPermissions({ query: vi.fn(async () => { throw new TypeError('unsupported'); }) });
        mocks.ativar.mockRejectedValueOnce(new Error('notif.erro_permissao_sem_resposta'));
        await m.solicitarAtivacao();
        await esvaziar();

        concederNoNavegador();
        document.dispatchEvent(new Event('visibilitychange'));
        await vi.waitFor(() => expect(mocks.concluirAtivacao).toHaveBeenCalledTimes(1));
    });

    it('survives a Permissions API that throws synchronously', async () => {
        definirPermissions({ query: () => { throw new Error('boom'); } });
        mocks.ativar.mockRejectedValueOnce(new Error('notif.erro_permissao_sem_resposta'));
        await m.solicitarAtivacao();
        concederNoNavegador();
        window.dispatchEvent(new Event('focus'));
        await vi.waitFor(() => expect(mocks.concluirAtivacao).toHaveBeenCalledTimes(1));
    });

    it('never subscribes silently: no click and no visible banner means no auto-activation', async () => {
        m.iniciarObservacaoDePermissao();
        expect(m.observandoPermissao()).toBe(true);

        concederNoNavegador();
        window.dispatchEvent(new Event('focus'));
        await esvaziar();
        await esvaziar();

        expect(mocks.concluirAtivacao).not.toHaveBeenCalled();
        expect(mocks.showToast).not.toHaveBeenCalled();
    });

    it('auto-activates when the banner is visible even without a click', async () => {
        m.definirBannerVisivel(true);
        expect(m.observandoPermissao()).toBe(true);

        concederNoNavegador();
        window.dispatchEvent(new Event('focus'));
        await vi.waitFor(() => expect(mocks.concluirAtivacao).toHaveBeenCalledTimes(1));
    });

    it('does not arm the watcher, nor subscribe, when the permission was already granted (e.g. after deactivating)', async () => {
        permissao.atual = 'granted';
        m.definirBannerVisivel(true);
        expect(m.observandoPermissao()).toBe(false);
        window.dispatchEvent(new Event('focus'));
        await esvaziar();
        expect(mocks.concluirAtivacao).not.toHaveBeenCalled();
    });

    it('does not auto-activate a browser that already has a subscription', async () => {
        mocks.obterEstadoPush.mockResolvedValue({
            suporte: 'suportado',
            inscrito: true,
            preferencias: { emprestimo: true, devolucao: true, ocorrencia: true }
        });
        m.definirBannerVisivel(true);
        concederNoNavegador();
        window.dispatchEvent(new Event('focus'));
        await vi.waitFor(() => expect(mocks.obterEstadoPush).toHaveBeenCalled());
        await esvaziar();
        expect(mocks.concluirAtivacao).not.toHaveBeenCalled();
        expect(mocks.showToast).not.toHaveBeenCalled();
    });

    it('does not auto-activate for a non-admin or when the server has no push', async () => {
        m.definirBannerVisivel(true);
        mocks.isAdmin.mockReturnValue(false);
        concederNoNavegador();
        window.dispatchEvent(new Event('focus'));
        await esvaziar();
        await esvaziar();
        expect(mocks.concluirAtivacao).not.toHaveBeenCalled();

        m.encerrarAtivacaoPush();
        permissao.atual = 'default';
        mocks.isAdmin.mockReturnValue(true);
        mocks.servidorPush.mockResolvedValue(false);
        m.definirBannerVisivel(true);
        concederNoNavegador();
        window.dispatchEvent(new Event('focus'));
        await vi.waitFor(() => expect(mocks.servidorPush).toHaveBeenCalled());
        await esvaziar();
        expect(mocks.concluirAtivacao).not.toHaveBeenCalled();
    });

    it('is idempotent: one set of listeners and a single activation for focus + visibilitychange + change', async () => {
        const espiao = vi.spyOn(window, 'addEventListener');
        m.definirBannerVisivel(true);
        m.iniciarObservacaoDePermissao();
        m.iniciarObservacaoDePermissao();
        expect(espiao.mock.calls.filter(([tipo]) => tipo === 'focus')).toHaveLength(1);
        espiao.mockRestore();
        await esvaziar();

        concederNoNavegador();
        status.state = 'granted';
        window.dispatchEvent(new Event('focus'));
        document.dispatchEvent(new Event('visibilitychange'));
        status.dispatchEvent(new Event('change'));
        await vi.waitFor(() => expect(mocks.concluirAtivacao).toHaveBeenCalledTimes(1));
        await esvaziar();
        expect(mocks.concluirAtivacao).toHaveBeenCalledTimes(1);
    });

    it('stops watching on logout and then ignores a later grant', async () => {
        m.initAtivacaoPush();
        mocks.ativar.mockRejectedValueOnce(new Error('notif.erro_permissao_sem_resposta'));
        await m.solicitarAtivacao();
        expect(m.observandoPermissao()).toBe(true);

        mocks.isAdmin.mockReturnValue(false);
        mocks.authListener?.({ autenticado: false });
        expect(m.observandoPermissao()).toBe(false);
        expect(m.orientacaoDePermissao()).toBeNull();

        mocks.isAdmin.mockReturnValue(true);
        concederNoNavegador();
        window.dispatchEvent(new Event('focus'));
        await esvaziar();
        expect(mocks.concluirAtivacao).not.toHaveBeenCalled();
    });

    it('stops the watcher when the banner is hidden and the user never clicked', () => {
        m.definirBannerVisivel(true);
        expect(m.observandoPermissao()).toBe(true);
        m.definirBannerVisivel(false);
        expect(m.observandoPermissao()).toBe(false);
    });

    it('shows an error toast when the automatic activation fails', async () => {
        mocks.concluirAtivacao.mockRejectedValueOnce(new Error('notif.erro_generico'));
        m.definirBannerVisivel(true);
        concederNoNavegador();
        window.dispatchEvent(new Event('focus'));
        await vi.waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith('notif.erro_generico', 'error'));
    });
});
