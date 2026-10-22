import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  login: vi.fn(),
  fetchMe: vi.fn(),
  logoutSession: vi.fn(),
}));

vi.mock('../core/api/auth.js', () => ({
  login: apiMocks.login,
  fetchMe: apiMocks.fetchMe,
  logoutSession: apiMocks.logoutSession,
}));

describe('authStore logout', () => {
  let storedToken: string | null;
  const storage = {
    getItem: vi.fn(() => storedToken),
    setItem: vi.fn((_key: string, value: string) => { storedToken = value; }),
    removeItem: vi.fn(() => { storedToken = null; }),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    storedToken = null;
    vi.stubGlobal('localStorage', storage);
    apiMocks.login.mockResolvedValue({
      token: 'synthetic-jwt-token',
      user: { id: 5, nome: 'Synthetic user', login: 'user@example.invalid', nivelAcesso: 'EDITOR' },
    });
    apiMocks.logoutSession.mockRejectedValue(new Error('synthetic offline failure'));
  });

  it('revokes server-side best-effort and clears local auth state synchronously', async () => {
    const { entrar, sair, isAutenticado } = await import('../core/state/authStore.js');
    await entrar('user@example.invalid', 'Synthetic-Password-01');
    expect(isAutenticado()).toBe(true);

    sair();

    expect(apiMocks.logoutSession).toHaveBeenCalledTimes(1);
    expect(storage.removeItem).toHaveBeenCalledWith('eduassets_token');
    expect(isAutenticado()).toBe(false);
  });
});
