// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    BANNER_DISPENSA_KEY,
    BANNER_DISPENSA_MS,
    bannerDispensado,
    decidirBanner,
    dispensarBanner
} from '../core/notifications/pushBanner.js';
import type { EntradaBanner } from '../core/notifications/pushBanner.js';

const base: EntradaBanner = { admin: true, servidorPush: true, suporte: 'suportado', inscrito: false, dispensado: false };

describe('decidirBanner', () => {
    it('offers activation to an admin when the server has push, support is fine, and there is no subscription', () => {
        expect(decidirBanner(base)).toBe('ativar');
    });

    it('shows the blocked guidance variant when the permission is denied', () => {
        expect(decidirBanner({ ...base, suporte: 'bloqueado' })).toBe('bloqueado');
    });

    it('shows the install hint variant on iOS outside the installed app', () => {
        expect(decidirBanner({ ...base, suporte: 'ios_instalar' })).toBe('ios');
    });

    it.each([
        ['non-admin (editor)', { admin: false }],
        ['server without push', { servidorPush: false }],
        ['already subscribed', { inscrito: true }],
        ['dismissed', { dispensado: true }],
        ['unsupported browser', { suporte: 'nao_suportado' as const }]
    ])('is hidden for %s', (_nome, mudanca) => {
        expect(decidirBanner({ ...base, ...mudanca })).toBe('oculto');
    });
});

describe('banner dismissal persistence', () => {
    const agora = Date.UTC(2026, 10, 13, 12, 0, 0);

    beforeEach(() => localStorage.clear());
    afterEach(() => vi.unstubAllGlobals());

    it('is not dismissed by default', () => {
        expect(bannerDispensado(agora)).toBe(false);
    });

    it('stays dismissed for 7 days and comes back afterwards', () => {
        dispensarBanner(agora);
        expect(Number(localStorage.getItem(BANNER_DISPENSA_KEY))).toBe(agora + BANNER_DISPENSA_MS);
        expect(BANNER_DISPENSA_MS).toBe(7 * 24 * 60 * 60 * 1000);
        expect(bannerDispensado(agora + 1000)).toBe(true);
        expect(bannerDispensado(agora + BANNER_DISPENSA_MS - 1)).toBe(true);
        expect(bannerDispensado(agora + BANNER_DISPENSA_MS)).toBe(false);
        expect(bannerDispensado(agora + BANNER_DISPENSA_MS + 1)).toBe(false);
    });

    it('ignores corrupt or tampered values', () => {
        localStorage.setItem(BANNER_DISPENSA_KEY, 'abc');
        expect(bannerDispensado(agora)).toBe(false);
        localStorage.setItem(BANNER_DISPENSA_KEY, String(agora + BANNER_DISPENSA_MS * 100));
        expect(bannerDispensado(agora)).toBe(false);
    });

    it('tolerates storage that throws', () => {
        vi.stubGlobal('localStorage', {
            getItem: () => { throw new Error('blocked'); },
            setItem: () => { throw new Error('quota'); }
        });
        expect(() => dispensarBanner(agora)).not.toThrow();
        expect(bannerDispensado(agora)).toBe(false);
    });
});
