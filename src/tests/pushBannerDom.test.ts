// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    isAdmin: vi.fn(() => true),
    servidorPush: vi.fn(async () => true),
    obterEstadoPush: vi.fn(),
    solicitarAtivacao: vi.fn(async () => true),
    definirBannerVisivel: vi.fn(),
    authListeners: [] as Array<(estado: { autenticado: boolean }) => void>
}));

vi.mock('../core/auth/permissions.js', () => ({ isAdmin: mocks.isAdmin }));
vi.mock('../core/api/notificacoes.js', () => ({ pushDisponivelNoServidor: mocks.servidorPush }));
vi.mock('../core/state/authStore.js', () => ({
    subscribe: (callback: (estado: { autenticado: boolean }) => void) => { mocks.authListeners.push(callback); return () => undefined; }
}));
vi.mock('../core/state/i18nStore.js', () => ({
    t: (chave: string) => chave,
    subscribe: () => () => undefined
}));
vi.mock('../core/notifications/pushNotifications.js', () => ({ obterEstadoPush: mocks.obterEstadoPush }));
vi.mock('../core/notifications/pushActivation.js', () => ({
    EVENTO_ESTADO_PUSH: 'eduassets:push-estado',
    solicitarAtivacao: mocks.solicitarAtivacao,
    definirBannerVisivel: mocks.definirBannerVisivel
}));

import { BANNER_DISPENSA_KEY, BANNER_DISPENSA_MS } from '../core/notifications/pushBanner.js';
import { initBannerNotificacoes } from '../features/notificacoes/banner.js';

const PREFS = { emprestimo: true, devolucao: true, ocorrencia: true };
const estado = (suporte: string, inscrito = false) => ({ suporte, inscrito, preferencias: PREFS });
const esvaziar = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const banner = (): HTMLElement => el('push-banner');

async function iniciar(): Promise<void> {
    initBannerNotificacoes();
    await esvaziar();
    await esvaziar();
}

describe('admin push banner', () => {
    beforeEach(() => {
        localStorage.clear();
        mocks.authListeners.length = 0;
        mocks.isAdmin.mockReturnValue(true);
        mocks.servidorPush.mockResolvedValue(true);
        mocks.obterEstadoPush.mockResolvedValue(estado('suportado'));
        mocks.solicitarAtivacao.mockResolvedValue(true);
        mocks.definirBannerVisivel.mockClear();
        mocks.solicitarAtivacao.mockClear();
        document.body.innerHTML = `
            <div class="push-banner" id="push-banner" role="region" hidden>
                <p id="push-banner-texto"></p>
                <button type="button" id="push-banner-ativar" hidden><span class="btn-label">x</span></button>
                <button type="button" id="push-banner-dispensar">x</button>
            </div>`;
    });

    afterEach(() => vi.useRealTimers());

    it('is visible for an admin with server push, a supported browser and no subscription', async () => {
        await iniciar();
        expect(banner().hidden).toBe(false);
        expect(banner().getAttribute('role')).toBe('region');
        expect(banner().getAttribute('aria-label')).toBe('notif.banner_aria');
        expect(el('push-banner-texto').textContent).toBe('notif.banner_texto');
        expect(el('push-banner-ativar').hidden).toBe(false);
        expect(el('push-banner-ativar').textContent).toBe('notif.banner_ativar');
        expect(el('push-banner-dispensar').textContent).toBe('notif.banner_agora_nao');
        expect(mocks.definirBannerVisivel).toHaveBeenLastCalledWith(true);
    });

    it('stays hidden for an editor', async () => {
        mocks.isAdmin.mockReturnValue(false);
        await iniciar();
        expect(banner().hidden).toBe(true);
    });

    it('stays hidden when this browser is already subscribed', async () => {
        mocks.obterEstadoPush.mockResolvedValue(estado('suportado', true));
        await iniciar();
        expect(banner().hidden).toBe(true);
    });

    it('stays hidden when the server has no push or the browser is unsupported', async () => {
        mocks.servidorPush.mockResolvedValue(false);
        await iniciar();
        expect(banner().hidden).toBe(true);

        mocks.servidorPush.mockResolvedValue(true);
        mocks.obterEstadoPush.mockResolvedValue(estado('nao_suportado'));
        window.dispatchEvent(new Event('eduassets:push-estado'));
        await esvaziar();
        await esvaziar();
        expect(banner().hidden).toBe(true);
    });

    it('shows the install hint without the button on iOS', async () => {
        mocks.obterEstadoPush.mockResolvedValue(estado('ios_instalar'));
        await iniciar();
        expect(banner().hidden).toBe(false);
        expect(el('push-banner-texto').textContent).toBe('notif.banner_ios');
        expect(el('push-banner-ativar').hidden).toBe(true);
        expect(mocks.definirBannerVisivel).toHaveBeenLastCalledWith(false);
    });

    it('replaces the button with the blocked guidance when the permission is denied', async () => {
        mocks.obterEstadoPush.mockResolvedValue(estado('bloqueado'));
        await iniciar();
        expect(banner().hidden).toBe(false);
        expect(el('push-banner-texto').textContent).toBe('notif.ajuda_bloqueado');
        expect(el('push-banner-ativar').hidden).toBe(true);
    });

    it('dismisses on "Agora não" and remembers it for 7 days', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        const agora = new Date('2026-11-13T12:00:00Z');
        vi.setSystemTime(agora);
        await iniciar();
        el('push-banner-dispensar').click();

        expect(banner().hidden).toBe(true);
        expect(Number(localStorage.getItem(BANNER_DISPENSA_KEY))).toBe(agora.getTime() + BANNER_DISPENSA_MS);

        // A page reload within 7 days keeps it hidden...
        await iniciar();
        expect(banner().hidden).toBe(true);

        // ...and it comes back after the window.
        vi.setSystemTime(new Date(agora.getTime() + BANNER_DISPENSA_MS + 1000));
        window.dispatchEvent(new Event('eduassets:push-estado'));
        await esvaziar();
        await esvaziar();
        expect(banner().hidden).toBe(false);
    });

    it('still dismisses for the session when localStorage fails', async () => {
        await iniciar();
        vi.stubGlobal('localStorage', {
            getItem: () => { throw new Error('blocked'); },
            setItem: () => { throw new Error('quota'); }
        });
        try {
            expect(() => el('push-banner-dispensar').click()).not.toThrow();
            expect(banner().hidden).toBe(true);
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('calls the activation from the click and hides right after success', async () => {
        mocks.solicitarAtivacao.mockImplementation(async () => {
            mocks.obterEstadoPush.mockResolvedValue(estado('suportado', true));
            return true;
        });
        await iniciar();
        el('push-banner-ativar').click();
        expect(mocks.solicitarAtivacao).toHaveBeenCalledTimes(1);
        await esvaziar();
        await esvaziar();
        // After the click the next evaluation sees a subscription.
        expect(banner().hidden).toBe(true);
    });

    it('stays visible when the activation did not complete', async () => {
        mocks.solicitarAtivacao.mockResolvedValue(false);
        await iniciar();
        el('push-banner-ativar').click();
        await esvaziar();
        await esvaziar();
        expect(banner().hidden).toBe(false);
        expect(el<HTMLButtonElement>('push-banner-ativar').disabled).toBe(false);
    });

    it('hides immediately on logout', async () => {
        await iniciar();
        expect(banner().hidden).toBe(false);
        mocks.isAdmin.mockReturnValue(false);
        mocks.authListeners.forEach((callback) => callback({ autenticado: false }));
        expect(banner().hidden).toBe(true);
    });

    it('re-evaluates on the push state event (e.g. activated from the Settings card)', async () => {
        await iniciar();
        expect(banner().hidden).toBe(false);
        mocks.obterEstadoPush.mockResolvedValue(estado('suportado', true));
        window.dispatchEvent(new Event('eduassets:push-estado'));
        await esvaziar();
        await esvaziar();
        expect(banner().hidden).toBe(true);
    });

    it('re-evaluates when the tab becomes visible again', async () => {
        mocks.obterEstadoPush.mockResolvedValue(estado('suportado', true));
        await iniciar();
        expect(banner().hidden).toBe(true);
        mocks.obterEstadoPush.mockResolvedValue(estado('suportado', false));
        document.dispatchEvent(new Event('visibilitychange'));
        await esvaziar();
        await esvaziar();
        expect(banner().hidden).toBe(false);
    });
});
