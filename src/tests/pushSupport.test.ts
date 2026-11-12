import { describe, expect, it } from 'vitest';
import { detectarSuportePush, ehIos } from '../core/notifications/pushSupport.js';
import type { AmbientePush } from '../core/notifications/pushSupport.js';

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPADOS_DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';

function ambiente(sobrescrever: Partial<AmbientePush> = {}): AmbientePush {
    return {
        userAgent: DESKTOP_UA,
        platform: 'Win32',
        maxTouchPoints: 0,
        standalone: false,
        temServiceWorker: true,
        temPushManager: true,
        temNotification: true,
        permissao: 'default',
        ...sobrescrever
    };
}

describe('ehIos', () => {
    it('recognises iPhone and iPad user agents', () => {
        expect(ehIos({ userAgent: IPHONE_UA, platform: 'iPhone', maxTouchPoints: 5 })).toBe(true);
        expect(ehIos({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X)', platform: 'iPad', maxTouchPoints: 5 })).toBe(true);
    });

    it('recognises iPadOS reporting a desktop Mac user agent, but not a real Mac', () => {
        expect(ehIos({ userAgent: IPADOS_DESKTOP_UA, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
        expect(ehIos({ userAgent: IPADOS_DESKTOP_UA, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
    });

    it('does not flag desktop or Android browsers', () => {
        expect(ehIos({ userAgent: DESKTOP_UA, platform: 'Win32', maxTouchPoints: 0 })).toBe(false);
        expect(ehIos({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130.0 Mobile Safari/537.36', platform: 'Linux armv8l', maxTouchPoints: 5 })).toBe(false);
    });
});

describe('detectarSuportePush', () => {
    it('reports supported when all APIs exist and the permission is not denied', () => {
        expect(detectarSuportePush(ambiente())).toBe('suportado');
        expect(detectarSuportePush(ambiente({ permissao: 'granted' }))).toBe('suportado');
    });

    it('asks iPhone/iPad users outside the installed app to add the app to the Home Screen', () => {
        // Safari tabs on iOS expose no PushManager, so the install hint must win over "unsupported".
        expect(detectarSuportePush(ambiente({
            userAgent: IPHONE_UA, platform: 'iPhone', maxTouchPoints: 5, standalone: false, temPushManager: false
        }))).toBe('ios_instalar');
        expect(detectarSuportePush(ambiente({
            userAgent: IPADOS_DESKTOP_UA, platform: 'MacIntel', maxTouchPoints: 5, standalone: false
        }))).toBe('ios_instalar');
    });

    it('supports iOS when running as an installed (standalone) app', () => {
        expect(detectarSuportePush(ambiente({
            userAgent: IPHONE_UA, platform: 'iPhone', maxTouchPoints: 5, standalone: true
        }))).toBe('suportado');
    });

    it('reports blocked when the permission was denied', () => {
        expect(detectarSuportePush(ambiente({ permissao: 'denied' }))).toBe('bloqueado');
        expect(detectarSuportePush(ambiente({
            userAgent: IPHONE_UA, platform: 'iPhone', maxTouchPoints: 5, standalone: true, permissao: 'denied'
        }))).toBe('bloqueado');
    });

    it('reports unsupported when a required API is missing', () => {
        expect(detectarSuportePush(ambiente({ temServiceWorker: false }))).toBe('nao_suportado');
        expect(detectarSuportePush(ambiente({ temPushManager: false }))).toBe('nao_suportado');
        expect(detectarSuportePush(ambiente({ temNotification: false, permissao: null }))).toBe('nao_suportado');
    });
});
