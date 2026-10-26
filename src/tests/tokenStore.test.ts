import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function syntheticJwt(exp: number): string {
    const base64url = (value: string) => btoa(value).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${base64url('{"alg":"HS256","typ":"JWT"}')}.${base64url(JSON.stringify({ exp }))}.synthetic-signature`;
}

describe('tokenStore expiry-aware persistence', () => {
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

    it('persists the JWT together with its signed expiration timestamp', async () => {
        const now = 1_800_000_000_000;
        vi.spyOn(Date, 'now').mockReturnValue(now);
        const jwt = syntheticJwt(now / 1000 + 3600);
        const { setToken, getToken } = await import('../core/state/tokenStore.js');

        expect(setToken(jwt)).toBe(true);
        expect(getToken()).toBe(jwt);
        expect(JSON.parse(storedValue!)).toEqual({ token: jwt, expiresAt: now + 3600_000 });
    });

    it('migrates a legacy raw JWT using its exp claim without extending its lifetime', async () => {
        const now = 1_800_000_000_000;
        vi.spyOn(Date, 'now').mockReturnValue(now);
        const jwt = syntheticJwt(now / 1000 + 1200);
        storedValue = jwt;
        const { getToken } = await import('../core/state/tokenStore.js');

        expect(getToken()).toBe(jwt);
        expect(JSON.parse(storedValue!)).toEqual({ token: jwt, expiresAt: now + 1200_000 });
    });

    it('removes an expired persisted session before it can be restored', async () => {
        const now = 1_800_000_000_000;
        vi.spyOn(Date, 'now').mockReturnValue(now);
        storedValue = JSON.stringify({ token: syntheticJwt(now / 1000 - 1), expiresAt: now + 86_400_000 });
        const { getToken } = await import('../core/state/tokenStore.js');

        expect(getToken()).toBeNull();
        expect(storage.removeItem).toHaveBeenCalledWith('eduassets_token');
        expect(storedValue).toBeNull();
    });

    it('expires an active token when its JWT exp time is reached', async () => {
        const now = 1_800_000_000_000;
        const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
        const dispatchEvent = vi.fn();
        vi.stubGlobal('window', { dispatchEvent });
        const jwt = syntheticJwt(now / 1000 + 1);
        const { setToken, getToken } = await import('../core/state/tokenStore.js');
        expect(setToken(jwt)).toBe(true);

        clock.mockReturnValue(now + 1000);
        expect(getToken()).toBeNull();
        expect(storedValue).toBeNull();
        expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'eduassets:sessao-expirada' }));
    });

    it('rejects malformed, non-JWT, or non-expiring tokens', async () => {
        const { setToken, getToken } = await import('../core/state/tokenStore.js');
        expect(setToken('not-a-jwt')).toBe(false);
        expect(getToken()).toBeNull();
        expect(storage.removeItem).toHaveBeenCalledWith('eduassets_token');
    });

    it('fails closed when localStorage cannot persist a valid token', async () => {
        const now = 1_800_000_000_000;
        vi.spyOn(Date, 'now').mockReturnValue(now);
        storage.setItem.mockImplementation(() => { throw new Error('synthetic storage failure'); });
        const jwt = syntheticJwt(now / 1000 + 3600);
        const { setToken, getToken } = await import('../core/state/tokenStore.js');

        expect(setToken(jwt)).toBe(false);
        expect(getToken()).toBeNull();
    });
});
