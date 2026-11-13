// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    APP_ROUTE_HASH,
    LOGIN_ROUTE_HASH,
    PRIVACY_ROUTE_HASH,
    TERMS_ROUTE_HASH,
    resolveEntryDestination,
    setEntryRoute,
} from '../core/layout/entryRoute.js';

describe('entry route', () => {
    it('requires a validated cookie session or an explicit guest choice before opening #app', () => {
        expect(resolveEntryDestination('', false, false)).toBe('login');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, false)).toBe('login');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, true)).toBe('app');
    });

    it('keeps an explicit #login request even if guest access was granted earlier in this tab', () => {
        expect(resolveEntryDestination(LOGIN_ROUTE_HASH, false, true)).toBe('login');
        expect(resolveEntryDestination(LOGIN_ROUTE_HASH, false, false)).toBe('login');
    });

    it('keeps validated cookie sessions in the app and rejected sessions at #login', () => {
        expect(resolveEntryDestination(LOGIN_ROUTE_HASH, true, false)).toBe('app');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, true)).toBe('app');
        expect(resolveEntryDestination('', false, false)).toBe('login');
    });

    it('opens the terms route without requiring an authenticated session', () => {
        expect(resolveEntryDestination(TERMS_ROUTE_HASH, false, false)).toBe('terms');
        expect(resolveEntryDestination(TERMS_ROUTE_HASH, true, false)).toBe('terms');
    });

    it('opens the privacy policy route without requiring an authenticated session', () => {
        expect(resolveEntryDestination(PRIVACY_ROUTE_HASH, false, false)).toBe('privacy');
        expect(resolveEntryDestination(PRIVACY_ROUTE_HASH, true, true)).toBe('privacy');
    });

    it('treats panel routes as app routes that still need a session or guest choice', () => {
        expect(resolveEntryDestination('#app/devolucoes', true, false)).toBe('app');
        expect(resolveEntryDestination('#app/devolucoes', false, true)).toBe('app');
        expect(resolveEntryDestination('#app/devolucoes', false, false)).toBe('login');
    });

    it('keeps a panel route in the URL when entering the app, so a reload reopens that panel', () => {
        window.location.hash = '#app/devolucoes';
        setEntryRoute('app');
        expect(window.location.hash).toBe('#app/devolucoes');
        expect(document.documentElement.dataset.entryState).toBe('app');

        window.location.hash = LOGIN_ROUTE_HASH;
        setEntryRoute('app');
        expect(window.location.hash).toBe(APP_ROUTE_HASH);

        setEntryRoute('login');
        expect(window.location.hash).toBe(LOGIN_ROUTE_HASH);
    });
});
