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
  let storedGuestMode: string | null;
  const storage = {
    getItem: vi.fn((key: string) => key === 'eduassets_token' ? storedToken : key === 'eduassets_guest_mode' ? storedGuestMode : null),
    setItem: vi.fn((key: string, value: string) => {
      if (key === 'eduassets_token') storedToken = value;
      if (key === 'eduassets_guest_mode') storedGuestMode = value;
    }),
    removeItem: vi.fn((key: string) => {
      if (key === 'eduassets_token') storedToken = null;
      if (key === 'eduassets_guest_mode') storedGuestMode = null;
    }),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    storedToken = null;
    storedGuestMode = null;
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

  it('enters Guest Mode without keeping a token or requesting server logout', async () => {
    const { entrar, entrarComoConvidado, isAutenticado, getUsuario, isModoConvidadoPersistido } = await import('../core/state/authStore.js');
    await entrar('user@example.invalid', 'Synthetic-Password-01');
    expect(isAutenticado()).toBe(true);

    entrarComoConvidado();

    expect(storage.removeItem).toHaveBeenCalledWith('eduassets_token');
    expect(storage.setItem).toHaveBeenCalledWith('eduassets_guest_mode', 'true');
    expect(apiMocks.logoutSession).not.toHaveBeenCalled();
    expect(isAutenticado()).toBe(false);
    expect(getUsuario()).toBeNull();
    expect(isModoConvidadoPersistido()).toBe(true);

    vi.resetModules();
    const afterReload = await import('../core/state/authStore.js');
    expect(afterReload.isModoConvidadoPersistido()).toBe(true);
  });

  it('clears guest preference when login succeeds or a stored token is rejected', async () => {
    const { entrar, iniciarSessao, isModoConvidadoPersistido, persistirModoConvidado } = await import('../core/state/authStore.js');
    persistirModoConvidado(true);
    await entrar('user@example.invalid', 'Synthetic-Password-01');
    expect(isModoConvidadoPersistido()).toBe(false);
    expect(storage.removeItem).toHaveBeenCalledWith('eduassets_guest_mode');

    storedToken = 'expired-synthetic-token';
    persistirModoConvidado(true);
    apiMocks.fetchMe.mockRejectedValueOnce(new Error('synthetic expired token'));
    await iniciarSessao();
    expect(isModoConvidadoPersistido()).toBe(false);
    expect(storedToken).toBeNull();
  });
});
