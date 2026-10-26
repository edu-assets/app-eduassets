import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  login: vi.fn(),
  fetchMe: vi.fn(),
  logoutSession: vi.fn(),
}));

function syntheticJwt(exp = Math.floor(Date.now() / 1000) + 3600): string {
  const base64url = (value: string) => btoa(value).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${base64url('{"alg":"HS256","typ":"JWT"}')}.${base64url(JSON.stringify({ exp }))}.synthetic-signature`;
}

vi.mock('../core/api/auth.js', () => ({
  login: apiMocks.login,
  fetchMe: apiMocks.fetchMe,
  logoutSession: apiMocks.logoutSession,
}));

describe('authStore logout', () => {
  let storedToken: string | null;
  let storedGuestMode: string | null;
  let storedGuestEntry: string | null;
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
  const sessionStorageMock = {
    getItem: vi.fn((key: string) => key === 'eduassets_guest_entry_authorized' ? storedGuestEntry : null),
    setItem: vi.fn((key: string, value: string) => {
      if (key === 'eduassets_guest_entry_authorized') storedGuestEntry = value;
    }),
    removeItem: vi.fn((key: string) => {
      if (key === 'eduassets_guest_entry_authorized') storedGuestEntry = null;
    }),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    storedToken = null;
    storedGuestMode = null;
    storedGuestEntry = null;
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('sessionStorage', sessionStorageMock);
    apiMocks.login.mockResolvedValue({
      token: syntheticJwt(),
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
    const { entrar, entrarComoConvidado, isAutenticado, getUsuario, isAcessoConvidadoAutorizado } = await import('../core/state/authStore.js');
    await entrar('user@example.invalid', 'Synthetic-Password-01');
    expect(isAutenticado()).toBe(true);

    entrarComoConvidado();

    expect(storage.removeItem).toHaveBeenCalledWith('eduassets_token');
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('eduassets_guest_entry_authorized', 'true');
    expect(apiMocks.logoutSession).not.toHaveBeenCalled();
    expect(isAutenticado()).toBe(false);
    expect(getUsuario()).toBeNull();
    expect(isAcessoConvidadoAutorizado()).toBe(true);

    vi.resetModules();
    const afterReload = await import('../core/state/authStore.js');
    expect(afterReload.isAcessoConvidadoAutorizado()).toBe(true);
  });

  it('does not treat an old persistent guest preference as permission to enter the app', async () => {
    storedGuestMode = 'true';
    const { isAcessoConvidadoAutorizado } = await import('../core/state/authStore.js');
    expect(isAcessoConvidadoAutorizado()).toBe(false);
    expect(storage.removeItem).toHaveBeenCalledWith('eduassets_guest_mode');
  });

  it('rejects a login response without a valid future JWT expiration', async () => {
    apiMocks.login.mockResolvedValueOnce({
      token: 'malformed-token',
      user: { id: 5, nome: 'Synthetic user', login: 'user@example.invalid', nivelAcesso: 'EDITOR' },
    });
    const { entrar, isAutenticado } = await import('../core/state/authStore.js');

    await expect(entrar('user@example.invalid', 'Synthetic-Password-01')).rejects.toThrow('auth.token_invalido');
    expect(isAutenticado()).toBe(false);
    expect(storedToken).toBeNull();
  });

  it('accepts a cookie-only login response without storing a bearer token in localStorage', async () => {
    apiMocks.login.mockResolvedValueOnce({
      user: { id: 5, nome: 'Synthetic user', login: 'user@example.invalid', nivelAcesso: 'EDITOR' },
    });
    const { entrar, isAutenticado } = await import('../core/state/authStore.js');

    await entrar('user@example.invalid', 'Synthetic-Password-01');

    expect(isAutenticado()).toBe(true);
    expect(storedToken).toBeNull();
  });

  it('preserves an explicitly authorized Guest Mode when /auth/me has no session cookie', async () => {
    storedGuestEntry = 'true';
    apiMocks.fetchMe.mockRejectedValueOnce(new Error('no cookie session'));
    const { iniciarSessao, isAcessoConvidadoAutorizado } = await import('../core/state/authStore.js');

    await iniciarSessao();

    expect(isAcessoConvidadoAutorizado()).toBe(true);
  });

  it('restores a persisted unexpired session after reload only after validating it with the API', async () => {
    const expiresAt = (Math.floor(Date.now() / 1000) + 3600) * 1000;
    const token = syntheticJwt(expiresAt / 1000);
    storedToken = JSON.stringify({ token, expiresAt });
    apiMocks.fetchMe.mockResolvedValueOnce({
      id: 5,
      nome: 'Synthetic user',
      login: 'user@example.invalid',
      nivelAcesso: 'EDITOR',
    });
    const { iniciarSessao, isAutenticado } = await import('../core/state/authStore.js');

    await iniciarSessao();

    expect(apiMocks.fetchMe).toHaveBeenCalledTimes(1);
    expect(isAutenticado()).toBe(true);
  });

  it('clears guest access after login succeeds or a stored token is rejected', async () => {
    const { entrar, entrarComoConvidado, iniciarSessao, isAcessoConvidadoAutorizado, atualizarToken } = await import('../core/state/authStore.js');
    entrarComoConvidado();
    await entrar('user@example.invalid', 'Synthetic-Password-01');
    expect(isAcessoConvidadoAutorizado()).toBe(false);
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('eduassets_guest_entry_authorized');

    entrarComoConvidado();
    atualizarToken(syntheticJwt());
    apiMocks.fetchMe.mockRejectedValueOnce(new Error('synthetic expired token'));
    await iniciarSessao();
    expect(isAcessoConvidadoAutorizado()).toBe(false);
    expect(storedToken).toBeNull();
  });
});
