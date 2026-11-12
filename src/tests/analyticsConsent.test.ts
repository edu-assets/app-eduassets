import { describe, expect, it } from 'vitest';
import {
    CONSENT_STORAGE_KEY,
    CONSENT_VERSION,
    analyticsCookieNames,
    cookieDomains,
    readConsent,
    sanitizePageLocation,
    writeConsent,
} from '../core/analytics/analyticsConsent.js';

function memoryStorage(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial));
    return {
        data,
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
    };
}

describe('analytics consent', () => {
    it('stores a versioned choice and ignores missing, malformed or outdated values', () => {
        const storage = memoryStorage();
        expect(readConsent(storage)).toBeNull();
        writeConsent('granted', storage, new Date('2026-11-12T15:00:00Z'));
        expect(JSON.parse(storage.data.get(CONSENT_STORAGE_KEY)!)).toEqual({ v: CONSENT_VERSION, choice: 'granted', at: '2026-11-12T15:00:00.000Z' });
        expect(readConsent(storage)).toBe('granted');
        writeConsent('denied', storage);
        expect(readConsent(storage)).toBe('denied');
        expect(readConsent(memoryStorage({ [CONSENT_STORAGE_KEY]: '{not json' }))).toBeNull();
        expect(readConsent(memoryStorage({ [CONSENT_STORAGE_KEY]: JSON.stringify({ v: CONSENT_VERSION + 1, choice: 'granted' }) }))).toBeNull();
        expect(readConsent(memoryStorage({ [CONSENT_STORAGE_KEY]: JSON.stringify({ v: CONSENT_VERSION, choice: 'maybe' }) }))).toBeNull();
        expect(readConsent(null)).toBeNull();
    });

    it('never sends fragments that carry values, such as the password reset token', () => {
        expect(sanitizePageLocation('https://app.eduassets.tech/#redefinir-senha=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCd'))
            .toBe('https://app.eduassets.tech/');
        expect(sanitizePageLocation('https://app.eduassets.tech/?q=ana@example.test#app')).toBe('https://app.eduassets.tech/#app');
        expect(sanitizePageLocation('https://app.eduassets.tech/#privacidade')).toBe('https://app.eduassets.tech/#privacidade');
    });

    it('finds Google Analytics cookies on every domain level to delete them on refusal', () => {
        expect(analyticsCookieNames('_ga=GA1.1.1; eduassets=1; _ga_9LJ1MQRCEV=GS1; _gid=x; other_ga=1'))
            .toEqual(['_ga', '_ga_9LJ1MQRCEV', '_gid']);
        expect(cookieDomains('app.eduassets.tech')).toEqual(['app.eduassets.tech', 'eduassets.tech']);
        expect(cookieDomains('localhost')).toEqual(['localhost']);
    });
});
