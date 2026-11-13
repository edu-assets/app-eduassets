// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface UsuarioTeste { id: number; nome: string; login: string; nivelAcesso: 'ADMINISTRADOR' | 'EDITOR' }

const auth = vi.hoisted(() => {
    const estado = {
        usuario: null as UsuarioTeste | null,
        origem: 'login' as 'login' | 'restaurada' | null,
        listeners: [] as Array<(s: { autenticado: boolean; usuario: UsuarioTeste | null }) => void>,
        sair: vi.fn(),
        notify(): void {
            estado.listeners.forEach((cb) => cb({ autenticado: estado.usuario !== null, usuario: estado.usuario }));
        },
    };
    return estado;
});
const api = vi.hoisted(() => ({ fetchMe: vi.fn() }));
const ui = vi.hoisted(() => ({ showToast: vi.fn(), openModal: vi.fn() }));

vi.mock('../core/state/authStore.js', () => ({
    getUsuario: () => auth.usuario,
    getOrigemSessao: () => (auth.usuario ? auth.origem : null),
    isAutenticado: () => auth.usuario !== null,
    isAcessoConvidadoAutorizado: () => false,
    subscribe: (cb: (s: { autenticado: boolean; usuario: UsuarioTeste | null }) => void) => {
        auth.listeners.push(cb);
        return () => { auth.listeners = auth.listeners.filter((l) => l !== cb); };
    },
    sair: (revogar = true) => {
        auth.sair(revogar);
        auth.usuario = null;
        auth.notify();
        return Promise.resolve();
    },
}));
vi.mock('../core/api/auth.js', () => ({ fetchMe: api.fetchMe }));
vi.mock('../core/ui/index.js', () => ({ showToast: ui.showToast, openModal: ui.openModal }));

import {
    ANTECEDENCIA_AVISO_MS,
    CHAVE_EVENTO_SESSAO,
    CHAVE_INATIVIDADE_EDITOR,
    CHAVE_ULTIMA_ATIVIDADE,
    CHAVE_ULTIMA_RENOVACAO,
    EVENTO_SAIR_SOLICITADO,
    LIMITE_INATIVIDADE_ADMIN_MS,
    __resetSessionTimeoutForTests,
    definirPreferenciaInatividadeEditor,
    formatarContagem,
    getPreferenciaInatividadeEditor,
    initSessionTimeout,
    isAvisoSessaoAberto,
    registrarLogoutExplicito,
} from '../core/auth/sessionTimeout.js';
import { CHAVE_ROTA_POS_LOGIN, restaurarRotaPosLogin } from '../core/auth/rotaPosLogin.js';
import { __resetNavigationForTests, getRotaAtual, initNavigation, navegarPara } from '../core/layout/navigation.js';
import { initSessaoConfig } from '../features/config/sessao.js';
import { definirIdioma } from '../core/state/i18nStore.js';

const MIN = 60_000;
const ADMIN_2: UsuarioTeste = { id: 9, nome: 'Outro', login: 'outro@example.invalid', nivelAcesso: 'ADMINISTRADOR' };
const ADMIN: UsuarioTeste = { id: 1, nome: 'Admin', login: 'admin@example.invalid', nivelAcesso: 'ADMINISTRADOR' };
const EDITOR: UsuarioTeste = { id: 2, nome: 'Editor', login: 'editor@example.invalid', nivelAcesso: 'EDITOR' };

function montarDom(): void {
    document.body.innerHTML = `
        <aside id="sidebar"><a href="#" class="nav-link" data-panel="panel-devolucao">Devoluções</a></aside>
        <main>
            <section class="panel active" id="panel-inicio"><h2>Início</h2></section>
            <section class="panel" id="panel-devolucao"><h2>Devoluções</h2></section>
            <section class="panel" id="panel-cadastros"><h2>Cadastros</h2></section>
            <section class="panel" id="panel-404"><h2>404</h2></section>
            <button id="fora">Fora</button>
        </main>
        <div class="modal-overlay" id="modal-sessao-expirando" data-close-on-overlay="false">
            <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="sessao-aviso-titulo" tabindex="-1">
                <div class="modal-header">
                    <h3 id="sessao-aviso-titulo">Sua sessão está prestes a expirar</h3>
                    <button type="button" class="modal-close-btn" aria-label="Fechar">x</button>
                </div>
                <p id="sessao-aviso-contagem" role="timer">02:00</p>
                <p id="sessao-aviso-erro" role="alert" hidden></p>
                <button id="sessao-aviso-sair" type="button">Sair agora</button>
                <button id="sessao-aviso-continuar" type="button">Continuar conectado</button>
            </div>
        </div>
        <div class="config-card" id="config-sessao-card" hidden>
            <button type="button" class="config-switch" id="config-sessao-switch" data-sessao-switch role="switch" aria-checked="false">
                <span class="config-switch-label">Desativado</span>
            </button>
            <select id="config-sessao-duracao" disabled>
                <option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">60 minutos</option>
            </select>
        </div>`;
}

function entrarComo(usuario: UsuarioTeste, origem: 'login' | 'restaurada' = 'login'): void {
    auth.usuario = usuario;
    auth.origem = origem;
    auth.notify();
}

/**
 * jsdom marks every script-dispatched event as untrusted (and resets the flag on dispatch). User input is simulated
 * by flipping the internal flag in a window capture listener, which runs before the module's own listeners.
 */
const eventosConfiaveis = new WeakSet<Event>();
const TIPOS_CONFIAVEIS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];

function marcarConfiavel(evento: Event): void {
    if (!eventosConfiaveis.has(evento)) return;
    const interno = Object.getOwnPropertySymbols(evento)
        .map((simbolo) => (evento as unknown as Record<symbol, { isTrusted?: boolean }>)[simbolo])
        .find((valor) => valor && 'isTrusted' in valor);
    if (!interno) throw new Error('jsdom internals changed');
    interno.isTrusted = true;
}

function confiavel<T extends Event>(evento: T): T {
    eventosConfiaveis.add(evento);
    return evento;
}

function interagir(tipo: string, init: MouseEventInit = {}): void {
    const evento = tipo === 'keydown' ? new KeyboardEvent(tipo, init) : new MouseEvent(tipo, init);
    document.dispatchEvent(confiavel(evento));
}

function marca(usuario: UsuarioTeste, t: number): string {
    return JSON.stringify({ u: usuario.id, t });
}

function lerMarcaArmazenada(chave: string): { u: number; t: number } {
    return JSON.parse(localStorage.getItem(chave)!) as { u: number; t: number };
}

function overlay(): HTMLElement {
    return document.getElementById('modal-sessao-expirando')!;
}

function contagem(): string {
    return document.getElementById('sessao-aviso-contagem')!.textContent ?? '';
}

function emitirStorage(key: string, newValue: string | null): void {
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
}

async function flush(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-03-02T10:00:00Z') });
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    auth.usuario = null;
    auth.origem = 'login';
    auth.listeners = [];
    auth.sair.mockReset();
    api.fetchMe.mockReset();
    api.fetchMe.mockResolvedValue(ADMIN);
    ui.showToast.mockReset();
    ui.openModal.mockReset();
    montarDom();
    definirIdioma('pt');
    TIPOS_CONFIAVEIS.forEach((tipo) => window.addEventListener(tipo, marcarConfiavel, true));
});

afterEach(() => {
    TIPOS_CONFIAVEIS.forEach((tipo) => window.removeEventListener(tipo, marcarConfiavel, true));
    __resetSessionTimeoutForTests();
    __resetNavigationForTests();
    vi.useRealTimers();
});

describe('session expiry warning (administrator)', () => {
    it('opens an accessible alert dialog 2 minutes before the 30-minute limit, with a live countdown', () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        expect(LIMITE_INATIVIDADE_ADMIN_MS - ANTECEDENCIA_AVISO_MS).toBe(28 * MIN);

        vi.advanceTimersByTime(28 * MIN - 1);
        expect(isAvisoSessaoAberto()).toBe(false);
        expect(overlay().classList.contains('active')).toBe(false);

        vi.advanceTimersByTime(1);
        expect(isAvisoSessaoAberto()).toBe(true);
        expect(overlay().classList.contains('active')).toBe(true);
        const caixa = overlay().querySelector('.modal-box')!;
        expect(caixa.getAttribute('role')).toBe('alertdialog');
        expect(caixa.getAttribute('aria-modal')).toBe('true');
        expect(overlay().querySelector('.modal-close-btn')).toBeNull();
        expect(document.activeElement?.id).toBe('sessao-aviso-continuar');
        expect(contagem()).toBe('02:00');

        vi.advanceTimersByTime(1000);
        expect(contagem()).toBe('01:59');
        vi.advanceTimersByTime(59_000);
        expect(contagem()).toBe('01:00');
        expect(auth.sair).not.toHaveBeenCalled();

        vi.advanceTimersByTime(60_000);
        expect(auth.sair).toHaveBeenCalledWith(true);
        expect(isAvisoSessaoAberto()).toBe(false);
        expect(ui.showToast).toHaveBeenCalledWith('Sessão expirada por inatividade. Faça login novamente.', 'warning');
        expect(ui.openModal).toHaveBeenCalledWith('modal-login');
        expect(window.location.hash).toBe('#login');
        expect(JSON.parse(localStorage.getItem(CHAVE_EVENTO_SESSAO)!)).toMatchObject({ tipo: 'expirada', motivo: 'inatividade' });
    });

    it('formats the countdown as mm:ss', () => {
        expect(formatarContagem(120_000)).toBe('02:00');
        expect(formatarContagem(61_500)).toBe('01:02');
        expect(formatarContagem(-5)).toBe('00:00');
    });

    it('user activity before the warning postpones it and renews the server timer at most once per minute', async () => {
        entrarComo(ADMIN);
        initSessionTimeout();

        vi.advanceTimersByTime(10 * MIN);
        interagir('pointerdown');
        await flush();
        expect(api.fetchMe).toHaveBeenCalledTimes(1);
        expect(api.fetchMe).toHaveBeenCalledWith();
        vi.advanceTimersByTime(30_000);
        interagir('keydown');
        await flush();
        expect(api.fetchMe).toHaveBeenCalledTimes(1);

        // Last confirmed renewal at 10 min (activity at 10.5 min): the server session ends at 40 min, so the
        // warning opens at 38 min, never later than the server allows.
        vi.advanceTimersByTime(28 * MIN - 30_001);
        expect(isAvisoSessaoAberto()).toBe(false);
        vi.advanceTimersByTime(1);
        expect(isAvisoSessaoAberto()).toBe(true);
    });

    it('activity inside the warning window does not dismiss it (an explicit choice is required)', () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(28 * MIN + 10_000);
        interagir('pointermove', { clientX: 5, clientY: 5 });
        expect(isAvisoSessaoAberto()).toBe(true);
        expect(api.fetchMe).not.toHaveBeenCalled();
    });

    it('"Continuar conectado" calls GET /auth/me (non-passive) and restarts the countdown', async () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(29 * MIN);
        expect(isAvisoSessaoAberto()).toBe(true);

        document.getElementById('sessao-aviso-continuar')!.click();
        await flush();

        expect(api.fetchMe).toHaveBeenCalledTimes(1);
        expect(api.fetchMe).toHaveBeenCalledWith();
        expect(isAvisoSessaoAberto()).toBe(false);
        expect(lerMarcaArmazenada(CHAVE_ULTIMA_ATIVIDADE)).toEqual({ u: ADMIN.id, t: Date.now() });
        expect(lerMarcaArmazenada(CHAVE_ULTIMA_RENOVACAO)).toEqual({ u: ADMIN.id, t: Date.now() });

        vi.advanceTimersByTime(28 * MIN - 1);
        expect(isAvisoSessaoAberto()).toBe(false);
        vi.advanceTimersByTime(1);
        expect(isAvisoSessaoAberto()).toBe(true);
        expect(auth.sair).not.toHaveBeenCalled();
    });

    it('"Continuar conectado" answered with 401 runs the expiry flow', async () => {
        navegarPara('devolucoes');
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(28 * MIN);
        api.fetchMe.mockRejectedValueOnce(Object.assign(new Error('expired'), { status: 401 }));

        document.getElementById('sessao-aviso-continuar')!.click();
        await flush();

        expect(auth.sair).toHaveBeenCalledTimes(1);
        expect(isAvisoSessaoAberto()).toBe(false);
        expect(window.location.hash).toBe('#login');
        expect(sessionStorage.getItem(CHAVE_ROTA_POS_LOGIN)).toBe('#app/devolucoes');
    });

    it('a network error keeps the dialog open with an error message', async () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(28 * MIN);
        api.fetchMe.mockRejectedValueOnce(Object.assign(new Error('offline'), { status: 503 }));

        document.getElementById('sessao-aviso-continuar')!.click();
        await flush();

        expect(isAvisoSessaoAberto()).toBe(true);
        const erro = document.getElementById('sessao-aviso-erro')!;
        expect(erro.hidden).toBe(false);
        expect(erro.textContent).toContain('Não foi possível confirmar a sessão');
        expect((document.getElementById('sessao-aviso-continuar') as HTMLButtonElement).disabled).toBe(false);
        expect(auth.sair).not.toHaveBeenCalled();
    });

    it('traps focus inside the dialog; Escape means "stay signed in"', async () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(28 * MIN);
        const caixa = overlay().querySelector<HTMLElement>('.modal-box')!;
        const continuar = document.getElementById('sessao-aviso-continuar')!;
        const sairBtn = document.getElementById('sessao-aviso-sair')!;

        expect(document.activeElement).toBe(continuar);
        caixa.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(sairBtn);
        caixa.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(continuar);

        document.getElementById('fora')!.focus();
        expect(document.activeElement).toBe(continuar);

        const escapeNoDocumento = vi.fn();
        document.addEventListener('keydown', escapeNoDocumento);
        caixa.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        document.removeEventListener('keydown', escapeNoDocumento);
        await flush();
        expect(escapeNoDocumento).not.toHaveBeenCalled();
        expect(api.fetchMe).toHaveBeenCalledTimes(1);
        expect(isAvisoSessaoAberto()).toBe(false);
    });

    it('"Sair agora" asks the auth feature for the regular explicit sign-out', () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(28 * MIN);
        const handler = vi.fn((evento: Event) => evento.preventDefault());
        window.addEventListener(EVENTO_SAIR_SOLICITADO, handler);

        document.getElementById('sessao-aviso-sair')!.click();
        window.removeEventListener(EVENTO_SAIR_SOLICITADO, handler);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(isAvisoSessaoAberto()).toBe(false);
        expect(auth.sair).not.toHaveBeenCalled();
    });

    it('"Sair agora" falls back to a plain sign-out when nobody handles the request', () => {
        sessionStorage.setItem(CHAVE_ROTA_POS_LOGIN, '#app/devolucoes');
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(28 * MIN);

        document.getElementById('sessao-aviso-sair')!.click();

        expect(auth.sair).toHaveBeenCalledWith(true);
        expect(window.location.hash).toBe('#login');
        expect(sessionStorage.getItem(CHAVE_ROTA_POS_LOGIN)).toBeNull();
    });

    it('a 401 reported by the API client expires the session', () => {
        entrarComo(EDITOR);
        initSessionTimeout();
        window.dispatchEvent(new Event('eduassets:sessao-expirada'));
        expect(auth.sair).toHaveBeenCalledWith(true);
        expect(ui.showToast).toHaveBeenCalledWith('Sessão expirada. Faça login novamente.', 'warning');
    });
});

describe('cross-tab synchronization', () => {
    it('activity in another tab postpones the warning', () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(20 * MIN);
        // The other tab also renewed the server session.
        localStorage.setItem(CHAVE_ULTIMA_RENOVACAO, marca(ADMIN, Date.now()));
        emitirStorage(CHAVE_ULTIMA_RENOVACAO, localStorage.getItem(CHAVE_ULTIMA_RENOVACAO));
        emitirStorage(CHAVE_ULTIMA_ATIVIDADE, marca(ADMIN, Date.now()));

        vi.advanceTimersByTime(8 * MIN);
        expect(isAvisoSessaoAberto()).toBe(false);
        vi.advanceTimersByTime(20 * MIN);
        expect(isAvisoSessaoAberto()).toBe(true);
    });

    it('"Continuar" in another tab closes the warning here', () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(29 * MIN);
        expect(isAvisoSessaoAberto()).toBe(true);

        localStorage.setItem(CHAVE_ULTIMA_RENOVACAO, marca(ADMIN, Date.now()));
        emitirStorage(CHAVE_ULTIMA_ATIVIDADE, marca(ADMIN, Date.now()));
        expect(isAvisoSessaoAberto()).toBe(false);
        vi.advanceTimersByTime(5 * MIN);
        expect(auth.sair).not.toHaveBeenCalled();
    });

    it('ignores stale or invalid activity values', () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(29 * MIN);
        emitirStorage(CHAVE_ULTIMA_ATIVIDADE, marca(ADMIN, Date.now() - 40 * MIN));
        emitirStorage(CHAVE_ULTIMA_ATIVIDADE, 'not-a-number');
        expect(isAvisoSessaoAberto()).toBe(true);
    });

    it('expiry in another tab signs this tab out without a second revocation and saves its route', () => {
        navegarPara('devolucoes');
        entrarComo(ADMIN);
        initSessionTimeout();

        emitirStorage(CHAVE_EVENTO_SESSAO, JSON.stringify({ tipo: 'expirada', motivo: 'inatividade', u: ADMIN.id, em: Date.now() }));

        expect(auth.sair).toHaveBeenCalledWith(false);
        expect(window.location.hash).toBe('#login');
        expect(sessionStorage.getItem(CHAVE_ROTA_POS_LOGIN)).toBe('#app/devolucoes');
        expect(ui.showToast).toHaveBeenCalledWith('Sessão expirada por inatividade. Faça login novamente.', 'warning');
    });

    it('explicit sign-out in another tab signs this tab out and forgets the route', () => {
        sessionStorage.setItem(CHAVE_ROTA_POS_LOGIN, '#app/devolucoes');
        entrarComo(ADMIN);
        initSessionTimeout();

        emitirStorage(CHAVE_EVENTO_SESSAO, JSON.stringify({ tipo: 'logout', u: ADMIN.id, em: Date.now() }));

        expect(auth.sair).toHaveBeenCalledWith(false);
        expect(sessionStorage.getItem(CHAVE_ROTA_POS_LOGIN)).toBeNull();
        expect(ui.showToast).toHaveBeenCalledWith('Sessão encerrada em outra aba.', 'info');
    });

    it('keeps working when localStorage throws', () => {
        const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
        try {
            entrarComo(ADMIN);
            expect(() => initSessionTimeout()).not.toThrow();
            vi.advanceTimersByTime(28 * MIN);
            expect(isAvisoSessaoAberto()).toBe(true);
            vi.advanceTimersByTime(2 * MIN);
            expect(auth.sair).toHaveBeenCalledWith(true);
        } finally {
            getItem.mockRestore();
            setItem.mockRestore();
        }
    });
});

describe('administrator deadline follows the last confirmed server renewal', () => {
    it('the initial sign-in counts as a confirmed renewal', () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        expect(lerMarcaArmazenada(CHAVE_ULTIMA_RENOVACAO)).toEqual({ u: ADMIN.id, t: Date.now() });
    });

    it('does not record a renewal before fetchMe succeeds, and never when it fails', async () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(10 * MIN);
        let resolver: (u: UsuarioTeste) => void = () => undefined;
        api.fetchMe.mockReturnValueOnce(new Promise<UsuarioTeste>((resolve) => { resolver = resolve; }));
        interagir('keydown');
        expect(api.fetchMe).toHaveBeenCalledTimes(1);
        expect(lerMarcaArmazenada(CHAVE_ULTIMA_RENOVACAO).t).toBe(Date.now() - 10 * MIN);
        // Another activity while the request is in flight does not fire a second request.
        vi.advanceTimersByTime(6_000);
        interagir('keydown');
        expect(api.fetchMe).toHaveBeenCalledTimes(1);

        resolver(ADMIN);
        await flush();
        expect(lerMarcaArmazenada(CHAVE_ULTIMA_RENOVACAO).t).toBe(Date.now());
    });

    it('when the renewal fails the countdown stays on the last confirmed renewal (never outlasts the server)', async () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(20 * MIN);
        api.fetchMe.mockRejectedValueOnce(Object.assign(new Error('offline'), { status: 503 }));
        interagir('keydown');
        await flush();
        expect(lerMarcaArmazenada(CHAVE_ULTIMA_RENOVACAO).t).toBe(Date.now() - 20 * MIN);

        // Activity at 20 min, but the server last heard of us at 0 min: warning at 28 min, expiry at 30 min.
        vi.advanceTimersByTime(8 * MIN - 1);
        expect(isAvisoSessaoAberto()).toBe(false);
        vi.advanceTimersByTime(1);
        expect(isAvisoSessaoAberto()).toBe(true);
        vi.advanceTimersByTime(2 * MIN);
        expect(auth.sair).toHaveBeenCalledWith(true);
    });

    it('editors are not affected by renewals', () => {
        entrarComo(EDITOR);
        initSessionTimeout();
        definirPreferenciaInatividadeEditor({ ativo: true, minutos: 15 });
        vi.advanceTimersByTime(10 * MIN);
        interagir('keydown');
        expect(api.fetchMe).not.toHaveBeenCalled();
        vi.advanceTimersByTime(13 * MIN - 1);
        expect(isAvisoSessaoAberto()).toBe(false);
        vi.advanceTimersByTime(1);
        expect(isAvisoSessaoAberto()).toBe(true);
    });
});

describe('restored session', () => {
    beforeEach(() => {
        localStorage.setItem(CHAVE_INATIVIDADE_EDITOR, JSON.stringify({ ativo: true, minutos: 15 }));
    });

    it('an editor restored after the limit elapsed is signed out instead of starting a fresh countdown', () => {
        localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, marca(EDITOR, Date.now() - 15 * MIN));
        entrarComo(EDITOR, 'restaurada');
        initSessionTimeout();

        expect(auth.sair).toHaveBeenCalledWith(true);
        expect(ui.showToast).toHaveBeenCalledWith('Sessão expirada por inatividade. Faça login novamente.', 'warning');
        expect(JSON.parse(localStorage.getItem(CHAVE_EVENTO_SESSAO)!)).toMatchObject({ tipo: 'expirada', u: EDITOR.id });
    });

    it('an editor restored within the limit keeps the session and starts counting from now', () => {
        localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, marca(EDITOR, Date.now() - 15 * MIN + 1));
        entrarComo(EDITOR, 'restaurada');
        initSessionTimeout();
        expect(auth.sair).not.toHaveBeenCalled();
        expect(lerMarcaArmazenada(CHAVE_ULTIMA_ATIVIDADE).t).toBe(Date.now());
    });

    it('a restored session without stored activity (or with another user\'s) starts fresh', () => {
        entrarComo(EDITOR, 'restaurada');
        initSessionTimeout();
        expect(auth.sair).not.toHaveBeenCalled();
        __resetSessionTimeoutForTests();
        auth.usuario = null;
        localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, marca(ADMIN_2, Date.now() - 2 * 60 * MIN));
        entrarComo(EDITOR, 'restaurada');
        initSessionTimeout();
        expect(auth.sair).not.toHaveBeenCalled();
    });

    it('a new interactive login always starts fresh, whatever the stored activity says', () => {
        localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, marca(EDITOR, Date.now() - 60 * MIN));
        entrarComo(EDITOR, 'login');
        initSessionTimeout();
        expect(auth.sair).not.toHaveBeenCalled();
        expect(lerMarcaArmazenada(CHAVE_ULTIMA_ATIVIDADE).t).toBe(Date.now());
    });

    it('an administrator restored after 30 minutes without activity is signed out', () => {
        localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, marca(ADMIN, Date.now() - 30 * MIN));
        entrarComo(ADMIN, 'restaurada');
        initSessionTimeout();
        expect(auth.sair).toHaveBeenCalledWith(true);
    });
});

describe('activity hardening', () => {
    it('ignores untrusted (synthetic) events', async () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(10 * MIN);
        document.dispatchEvent(new KeyboardEvent('keydown'));
        document.dispatchEvent(new MouseEvent('pointerdown'));
        await flush();
        expect(api.fetchMe).not.toHaveBeenCalled();
        vi.advanceTimersByTime(18 * MIN);
        expect(isAvisoSessaoAberto()).toBe(true);
    });

    it('counts pointermove only when the coordinates change', () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        interagir('pointermove', { clientX: 10, clientY: 20 });
        vi.advanceTimersByTime(10 * MIN);
        const antes = lerMarcaArmazenada(CHAVE_ULTIMA_ATIVIDADE).t;

        interagir('pointermove', { clientX: 10, clientY: 20 });
        expect(lerMarcaArmazenada(CHAVE_ULTIMA_ATIVIDADE).t).toBe(antes);
        // A pointermove without coordinates (synthetic layout noise) is not a movement either.
        document.dispatchEvent(confiavel(new Event('pointermove')));
        expect(lerMarcaArmazenada(CHAVE_ULTIMA_ATIVIDADE).t).toBe(antes);

        interagir('pointermove', { clientX: 11, clientY: 20 });
        expect(lerMarcaArmazenada(CHAVE_ULTIMA_ATIVIDADE).t).toBe(Date.now());
    });

    it('visibilitychange re-evaluates the deadlines but is not activity and sends no heartbeat', async () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(10 * MIN);
        document.dispatchEvent(new Event('visibilitychange'));
        await flush();
        expect(api.fetchMe).not.toHaveBeenCalled();
        expect(lerMarcaArmazenada(CHAVE_ULTIMA_ATIVIDADE).t).toBe(Date.now() - 10 * MIN);

        // Timers throttled in the background: the deadline passed while hidden, becoming visible expires the session.
        vi.setSystemTime(Date.now() + 25 * MIN);
        document.dispatchEvent(new Event('visibilitychange'));
        expect(auth.sair).toHaveBeenCalledWith(true);
    });
});

describe('cross-tab values are tied to the user', () => {
    it('activity entries of another user or malformed ones are ignored', () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(20 * MIN);
        emitirStorage(CHAVE_ULTIMA_ATIVIDADE, marca(ADMIN_2, Date.now()));
        emitirStorage(CHAVE_ULTIMA_ATIVIDADE, String(Date.now()));
        emitirStorage(CHAVE_ULTIMA_ATIVIDADE, JSON.stringify({ t: Date.now() }));
        emitirStorage(CHAVE_ULTIMA_ATIVIDADE, 'null');
        vi.advanceTimersByTime(8 * MIN);
        expect(isAvisoSessaoAberto()).toBe(true);
    });

    it('stored activity of another user is not used by this tab', () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(20 * MIN);
        localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, marca(ADMIN_2, Date.now()));
        vi.advanceTimersByTime(8 * MIN);
        expect(isAvisoSessaoAberto()).toBe(true);
    });

    it('expiry and logout events of another user, without user id or malformed are ignored', () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        emitirStorage(CHAVE_EVENTO_SESSAO, JSON.stringify({ tipo: 'expirada', motivo: 'inatividade', u: ADMIN_2.id, em: Date.now() }));
        emitirStorage(CHAVE_EVENTO_SESSAO, JSON.stringify({ tipo: 'logout', u: ADMIN_2.id, em: Date.now() }));
        emitirStorage(CHAVE_EVENTO_SESSAO, JSON.stringify({ tipo: 'logout', em: Date.now() }));
        emitirStorage(CHAVE_EVENTO_SESSAO, 'null');
        emitirStorage(CHAVE_EVENTO_SESSAO, '{oops');
        expect(auth.sair).not.toHaveBeenCalled();
    });

    it('published expiry and logout events carry the user id', () => {
        entrarComo(ADMIN);
        initSessionTimeout();
        registrarLogoutExplicito();
        expect(JSON.parse(localStorage.getItem(CHAVE_EVENTO_SESSAO)!)).toMatchObject({ tipo: 'logout', u: ADMIN.id });
    });
});

describe('editor client-only inactivity timeout', () => {
    it('is off by default: editors are never warned or signed out by the client', () => {
        expect(getPreferenciaInatividadeEditor()).toEqual({ ativo: false, minutos: 30 });
        entrarComo(EDITOR);
        initSessionTimeout();
        vi.advanceTimersByTime(5 * 60 * MIN);
        expect(isAvisoSessaoAberto()).toBe(false);
        expect(auth.sair).not.toHaveBeenCalled();
    });

    it('when enabled, warns 2 minutes before the chosen limit and signs out (revoking the session)', () => {
        entrarComo(EDITOR);
        initSessionTimeout();
        definirPreferenciaInatividadeEditor({ ativo: true, minutos: 15 });
        expect(JSON.parse(localStorage.getItem(CHAVE_INATIVIDADE_EDITOR)!)).toEqual({ ativo: true, minutos: 15 });

        vi.advanceTimersByTime(13 * MIN - 1);
        expect(isAvisoSessaoAberto()).toBe(false);
        vi.advanceTimersByTime(1);
        expect(isAvisoSessaoAberto()).toBe(true);
        // Editors have no server idle limit: activity never triggers server renewals.
        expect(api.fetchMe).not.toHaveBeenCalled();

        vi.advanceTimersByTime(2 * MIN);
        expect(auth.sair).toHaveBeenCalledWith(true);
        expect(ui.showToast).toHaveBeenCalledWith('Sessão expirada por inatividade. Faça login novamente.', 'warning');
    });

    it('turning the setting off closes a pending warning; other tabs follow the stored setting', () => {
        entrarComo(EDITOR);
        initSessionTimeout();
        definirPreferenciaInatividadeEditor({ ativo: true, minutos: 15 });
        vi.advanceTimersByTime(14 * MIN);
        expect(isAvisoSessaoAberto()).toBe(true);

        localStorage.setItem(CHAVE_INATIVIDADE_EDITOR, JSON.stringify({ ativo: false, minutos: 15 }));
        emitirStorage(CHAVE_INATIVIDADE_EDITOR, localStorage.getItem(CHAVE_INATIVIDADE_EDITOR));
        expect(isAvisoSessaoAberto()).toBe(false);
        vi.advanceTimersByTime(60 * MIN);
        expect(auth.sair).not.toHaveBeenCalled();
    });

    it('ignores the editor setting for administrators', () => {
        localStorage.setItem(CHAVE_INATIVIDADE_EDITOR, JSON.stringify({ ativo: true, minutos: 60 }));
        entrarComo(ADMIN);
        initSessionTimeout();
        vi.advanceTimersByTime(28 * MIN);
        expect(isAvisoSessaoAberto()).toBe(true);
    });

    it('settings card: visible to editors only, switch and duration select update the stored preference', () => {
        initSessionTimeout();
        initSessaoConfig();
        const card = document.getElementById('config-sessao-card')!;
        const switchEl = document.getElementById('config-sessao-switch')!;
        const duracao = document.getElementById('config-sessao-duracao') as HTMLSelectElement;
        expect(card.hidden).toBe(true);

        entrarComo(ADMIN);
        expect(card.hidden).toBe(true);
        entrarComo(EDITOR);
        expect(card.hidden).toBe(false);
        expect(switchEl.getAttribute('aria-checked')).toBe('false');
        expect(duracao.disabled).toBe(true);
        expect(duracao.value).toBe('30');

        switchEl.click();
        expect(switchEl.getAttribute('aria-checked')).toBe('true');
        expect(switchEl.querySelector('.config-switch-label')!.textContent).toBe('Ativado');
        expect(duracao.disabled).toBe(false);
        duracao.value = '60';
        duracao.dispatchEvent(new Event('change'));
        expect(getPreferenciaInatividadeEditor()).toEqual({ ativo: true, minutos: 60 });
        expect(JSON.parse(localStorage.getItem(CHAVE_INATIVIDADE_EDITOR)!)).toEqual({ ativo: true, minutos: 60 });
    });
});

describe('route after expiry and sign-out', () => {
    it('saves the current route on expiry and restores it after signing in again, then clears it', () => {
        initNavigation();
        entrarComo(ADMIN);
        navegarPara('devolucoes');
        initSessionTimeout();
        vi.advanceTimersByTime(30 * MIN);
        expect(auth.sair).toHaveBeenCalled();
        expect(sessionStorage.getItem(CHAVE_ROTA_POS_LOGIN)).toBe('#app/devolucoes');

        // Sign in again, from the home panel of another router state.
        navegarPara('inicio');
        window.history.replaceState(null, '', '/#login');
        entrarComo(ADMIN);
        expect(restaurarRotaPosLogin()).toBe(true);
        expect(getRotaAtual()).toEqual({ slug: 'devolucoes' });
        expect(window.location.hash).toBe('#app/devolucoes');
        expect(sessionStorage.getItem(CHAVE_ROTA_POS_LOGIN)).toBeNull();
    });

    it('still applies permissions: an editor never lands on an admin-only panel', () => {
        initNavigation();
        sessionStorage.setItem(CHAVE_ROTA_POS_LOGIN, '#app/cadastros');
        window.history.replaceState(null, '', '/#login');
        entrarComo(EDITOR);
        restaurarRotaPosLogin();
        expect(getRotaAtual()).toEqual({ slug: 'inicio' });
        expect(sessionStorage.getItem(CHAVE_ROTA_POS_LOGIN)).toBeNull();
    });

    it('before the router starts, puts the saved route in the URL for initNavigation', () => {
        sessionStorage.setItem(CHAVE_ROTA_POS_LOGIN, '#app/devolucoes');
        window.history.replaceState(null, '', '/#login');
        entrarComo(ADMIN);
        expect(restaurarRotaPosLogin()).toBe(true);
        expect(window.location.hash).toBe('#app/devolucoes');
        initNavigation();
        expect(getRotaAtual()).toEqual({ slug: 'devolucoes' });
    });

    it('a specific panel already in the URL wins over the saved one', () => {
        sessionStorage.setItem(CHAVE_ROTA_POS_LOGIN, '#app/devolucoes');
        window.history.replaceState(null, '', '/#app/cadastros');
        expect(restaurarRotaPosLogin()).toBe(false);
        expect(sessionStorage.getItem(CHAVE_ROTA_POS_LOGIN)).toBeNull();
    });

    it('explicit sign-out clears the saved route and the last panel, so the next user starts at Início', async () => {
        initNavigation();
        entrarComo(ADMIN);
        navegarPara('devolucoes');
        initSessionTimeout();
        sessionStorage.setItem(CHAVE_ROTA_POS_LOGIN, '#app/devolucoes');

        registrarLogoutExplicito();
        expect(JSON.parse(localStorage.getItem(CHAVE_EVENTO_SESSAO)!)).toMatchObject({ tipo: 'logout' });
        auth.usuario = null;
        auth.notify();
        window.location.hash = '#login';
        await vi.waitFor(() => expect(window.location.hash).toBe('#login'));

        expect(sessionStorage.getItem(CHAVE_ROTA_POS_LOGIN)).toBeNull();
        expect(getRotaAtual()).toBeNull();

        // Next user enters the app through bare "#app": the home panel, not the previous user's panel.
        entrarComo(EDITOR);
        window.location.hash = '#app';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        expect(getRotaAtual()).toEqual({ slug: 'inicio' });
    });
});

describe('Continuar uses a non-passive request', () => {
    it('fetchMe sends GET /auth/me without the passive-activity header', async () => {
        vi.useRealTimers();
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ cookieSession: true }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify(ADMIN), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        try {
            const real = await vi.importActual<typeof import('../core/api/auth.js')>('../core/api/auth.js');
            await real.fetchMe();
            const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
            expect(url).toMatch(/\/auth\/me$/);
            expect(init.method).toBe('GET');
            expect(new Headers(init.headers).get('X-EduAssets-Atividade')).toBeNull();
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
