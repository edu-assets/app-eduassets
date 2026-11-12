// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { CONSENT_STORAGE_KEY, GA_MEASUREMENT_ID, initAnalyticsConsent } from '../core/analytics/analyticsConsent.js';

const gaScripts = () => document.head.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]');

describe('analytics consent banner', () => {
    beforeEach(() => {
        localStorage.clear();
        document.head.innerHTML = '';
        document.body.innerHTML = `
            <div id="cookie-consent" hidden>
                <button data-consent-choice="denied">Recusar</button>
                <button data-consent-choice="granted">Aceitar</button>
            </div>
            <button data-open-cookie-preferences>Preferências</button>`;
    });

    it('loads nothing before a choice, loads GA once after accepting and stops it after refusing', () => {
        window.location.hash = '#redefinir-senha=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCd';
        initAnalyticsConsent();
        const banner = document.getElementById('cookie-consent')!;
        expect(banner.hidden).toBe(false);
        expect(gaScripts()).toHaveLength(0);

        document.querySelector<HTMLButtonElement>('[data-consent-choice="granted"]')!.click();
        expect(banner.hidden).toBe(true);
        expect(gaScripts()).toHaveLength(1);
        expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!).choice).toBe('granted');
        const config = (window as unknown as { dataLayer: IArguments[] }).dataLayer.find((args) => args[0] === 'config');
        expect(config?.[1]).toBe(GA_MEASUREMENT_ID);
        expect(JSON.stringify(config?.[2])).not.toContain('redefinir-senha');

        document.querySelector<HTMLButtonElement>('[data-open-cookie-preferences]')!.click();
        expect(banner.hidden).toBe(false);
        document.cookie = '_ga=GA1.1.123; path=/';
        document.querySelector<HTMLButtonElement>('[data-consent-choice="denied"]')!.click();
        expect(document.cookie).not.toContain('_ga=');
        expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`]).toBe(true);
        expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!).choice).toBe('denied');
        expect(banner.hidden).toBe(true);
    });
});
