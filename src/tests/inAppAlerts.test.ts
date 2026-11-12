import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    isAdmin: vi.fn(() => true),
    showToast: vi.fn(),
    tocarAlerta: vi.fn(() => true),
    abrirPainelDaNotificacao: vi.fn(),
    sincronizar: vi.fn(async () => undefined)
}));

vi.mock('../core/auth/permissions.js', () => ({ isAdmin: mocks.isAdmin }));
vi.mock('../core/ui/toast.js', () => ({ showToast: mocks.showToast }));
vi.mock('../core/state/i18nStore.js', () => ({ t: (key: string) => key }));
vi.mock('../core/notifications/alertSound.js', () => ({ tocarAlerta: mocks.tocarAlerta }));
vi.mock('../core/notifications/notificationRouting.js', () => ({ abrirPainelDaNotificacao: mocks.abrirPainelDaNotificacao }));
vi.mock('../core/notifications/pushNotifications.js', () => ({ sincronizar: mocks.sincronizar }));

import { tratarMensagemServiceWorker } from '../core/notifications/inAppAlerts.js';

const mensagem = {
    type: 'eduassets:notificacao',
    payload: {
        v: 1,
        tipo: 'EMPRESTIMO_CRIADO',
        titulo: 'Novo empréstimo',
        corpo: 'Ana Souza · Notebook ×2',
        url: '/#panel-controle',
        tag: 'emprestimo',
        criadoEm: '2026-11-12T12:00:00.000Z'
    }
};

describe('service worker message handling', () => {
    beforeEach(() => {
        Object.values(mocks).forEach((mock) => mock.mockClear());
        mocks.isAdmin.mockReturnValue(true);
    });

    afterEach(() => vi.unstubAllGlobals());

    it('maps a push message to an info toast (title and body) and plays the alert sound', () => {
        expect(tratarMensagemServiceWorker(mensagem)).toBe(true);
        expect(mocks.showToast).toHaveBeenCalledTimes(1);
        expect(mocks.showToast).toHaveBeenCalledWith('Novo empréstimo\nAna Souza · Notebook ×2', 'info');
        expect(mocks.tocarAlerta).toHaveBeenCalledTimes(1);
    });

    it('falls back to a generic title when the payload has none', () => {
        tratarMensagemServiceWorker({ type: 'eduassets:notificacao', payload: {} });
        expect(mocks.showToast).toHaveBeenCalledWith('notif.atividade_generica', 'info');
    });

    it('ignores non-administrators', () => {
        mocks.isAdmin.mockReturnValue(false);
        expect(tratarMensagemServiceWorker(mensagem)).toBe(false);
        expect(mocks.showToast).not.toHaveBeenCalled();
        expect(mocks.tocarAlerta).not.toHaveBeenCalled();
    });

    it('does not alert in a hidden tab (the system notification covers it)', () => {
        vi.stubGlobal('document', { visibilityState: 'hidden' });
        expect(tratarMensagemServiceWorker(mensagem)).toBe(false);
        expect(mocks.showToast).not.toHaveBeenCalled();
    });

    it('ignores unknown or malformed messages', () => {
        expect(tratarMensagemServiceWorker(null)).toBe(false);
        expect(tratarMensagemServiceWorker('texto')).toBe(false);
        expect(tratarMensagemServiceWorker({ type: 'outra-coisa' })).toBe(false);
        expect(mocks.showToast).not.toHaveBeenCalled();
    });

    it('routes notification clicks to the target panel without showing a toast', () => {
        tratarMensagemServiceWorker({ type: 'eduassets:abrir', url: '/#panel-controle' });
        expect(mocks.abrirPainelDaNotificacao).toHaveBeenCalledWith('/#panel-controle');
        expect(mocks.showToast).not.toHaveBeenCalled();
    });

    it('re-syncs the subscription when the service worker reports a change (administrators only)', () => {
        tratarMensagemServiceWorker({ type: 'eduassets:push-resync' });
        expect(mocks.sincronizar).toHaveBeenCalledTimes(1);
        mocks.isAdmin.mockReturnValue(false);
        tratarMensagemServiceWorker({ type: 'eduassets:push-resync' });
        expect(mocks.sincronizar).toHaveBeenCalledTimes(1);
    });
});
