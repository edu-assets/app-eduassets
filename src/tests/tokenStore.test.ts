import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function syntheticJwt(exp: number): string {
    const base64url = (value: string) => btoa(value).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${base64url('{"alg":"HS256","typ":"JWT"}')}.${base64url(JSON.stringify({ exp }))}.synthetic-signature`;
}

describe('cookie-only token store', () => {
    let storedValue: string | null;
    const storage = {
        getItem: vi.fn(() => storedValue),
        setItem: vi.fn((_key: string, value: string) => { storedValue = value; }),
        removeItem: vi.fn(() => { storedValue = null; }),
    };

    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        vi.clearAllMocks();
        storedValue = null;
        vi.stubGlobal('localStorage', storage);
    });

    afterEach(() => vi.unstubAllGlobals());

    it('deletes a legacy persisted JWT and never restores it', async () => {
        storedValue = syntheticJwt(Math.floor(Date.now() / 1000) + 3600);
        const { getToken } = await import('../core/state/tokenStore.js');

        expect(getToken()).toBeNull();
        expect(storedValue).toBeNull();
        expect(storage.removeItem).toHaveBeenCalledWith('eduassets_token');
    });

    it('rejects any attempt to persist a bearer token', async () => {
        const { setToken, getToken } = await import('../core/state/tokenStore.js');
        const jwt = syntheticJwt(Math.floor(Date.now() / 1000) + 3600);

        expect(setToken(jwt)).toBe(false);
        expect(getToken()).toBeNull();
        expect(storage.setItem).not.toHaveBeenCalled();
        expect(storedValue).toBeNull();
    });

    it('clears legacy state idempotently when a cookie session is cleared', async () => {
        storedValue = 'legacy-token';
        const { setToken } = await import('../core/state/tokenStore.js');

        expect(setToken(null)).toBe(true);
        expect(storedValue).toBeNull();
        expect(storage.setItem).not.toHaveBeenCalled();
    });
});
