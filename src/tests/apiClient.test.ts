import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/api/apiConfig.js', () => ({ API_BASE_URL: 'https://api.example.invalid' }));
vi.mock('../core/state/i18nStore.js', () => ({ t: (key: string) => key }));

const fetchMock = vi.fn();

describe('cookie-only API client', () => {
    beforeEach(() => {
        vi.resetModules();
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => vi.unstubAllGlobals());

    it('fails closed when session-capability negotiation fails and does not submit credentials', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('synthetic capability outage'));
        const { http } = await import('../core/api/apiClient.js');

        await expect(http.post('/auth/login', { login: 'user@example.invalid', password: 'Synthetic-Password-01' }, { authMode: 'cookie' }))
            .rejects.toMatchObject({ status: 503 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.invalid/auth/session-capabilities');
    });

    it('sends cookie mode and credentials when the API advertises HttpOnly sessions', async () => {
        fetchMock
            .mockResolvedValueOnce(new Response(JSON.stringify({ cookieSession: true }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: 5, nome: 'Synthetic', login: 'user@example.invalid', nivelAcesso: 'EDITOR' } }), { status: 200 }));
        const { http } = await import('../core/api/apiClient.js');

        const result = await http.post('/auth/login', { login: 'user@example.invalid', password: 'Synthetic-Password-01' }, { authMode: 'cookie' });

        expect(result).toHaveProperty('user.id', 5);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const request = fetchMock.mock.calls[1][1] as RequestInit;
        const headers = new Headers(request.headers);
        expect(request.credentials).toBe('include');
        expect(headers.get('x-auth-mode')).toBe('cookie');
        expect(headers.get('authorization')).toBeNull();
    });
});
