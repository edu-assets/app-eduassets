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

const user = { id: 5, nome: 'Synthetic user', login: 'user@example.invalid', nivelAcesso: 'EDITOR' as const };

vi.mock('../core/api/auth.js', () => ({
  login: apiMocks.login,
  fetchMe: apiMocks.fetchMe,
  logoutSession: apiMocks.logoutSession,
}));

describe('authStore cookie sessions', () => {
  let storedToken: string | null;
  let storedGuestMode: string | null;
  let storedGuestEntry: string | null;
  const otherKeys = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => key === 'eduassets_token' ? storedToken : key === 'eduassets_guest_mode' ? storedGuestMode : otherKeys.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      if (key === 'eduassets_token') storedToken = value;
      else if (key === 'eduassets_guest_mode') storedGuestMode = value;
      else otherKeys.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      if (key === 'eduassets_token') storedToken = null;
      else if (key === 'eduassets_guest_mode') storedGuestMode = null;
      else otherKeys.delete(key);
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
    otherKeys.clear();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('sessionStorage', sessionStorageMock);
    apiMocks.login.mockResolvedValue({ user });
    apiMocks.fetchMe.mockReset();
    apiMocks.logoutSession.mockRejectedValue(new Error('synthetic offline failure'));
  });

  it('revokes server-side best-effort and clears local auth state synchronously', async () => {
    const { entrar, sair, isAutenticado } = await import('../core/state/authStore.js');
    await entrar('user@example.invalid', 'Synthetic-Password-01');
    expect(isAutenticado()).toBe(true);

    sair();

    expect(apiMocks.logoutSession).toHaveBeenCalledTimes(1);
    expect(storage.removeItem).toHaveBeenCalledWith('eduassets_token');
    expect(storage.setItem).not.toHaveBeenCalledWith('eduassets_token', expect.anything());
    expect(isAutenticado()).toBe(false);
  });

  it('enters Guest Mode without keeping a token or requesting server logout', async () => {
    const { entrar, entrarComoConvidado, isAutenticado, getUsuario, isAcessoConvidadoAutorizado } = await import('../core/state/authStore.js');
    await entrar('user@example.invalid', 'Synthetic-Password-01');
    expect(isAutenticado()).toBe(true);

    entrarComoConvidado();

    expect(storedToken).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalledWith('eduassets_token', expect.anything());
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('eduassets_guest_entry_authorized', 'true');
    expect(apiMocks.logoutSession).not.toHaveBeenCalled();
    expect(isAutenticado()).toBe(false);
    expect(getUsuario()).toBeNull();
    expect(isAcessoConvidadoAutorizado()).toBe(true);
  });

  it('does not treat an old persistent guest preference as permission to enter the app', async () => {
    storedGuestMode = 'true';
    const { isAcessoConvidadoAutorizado } = await import('../core/state/authStore.js');
    expect(isAcessoConvidadoAutorizado()).toBe(false);
    expect(storage.removeItem).toHaveBeenCalledWith('eduassets_guest_mode');
  });

  it('never persists an unexpected legacy token included in a login response', async () => {
    apiMocks.login.mockResolvedValueOnce({ token: syntheticJwt(), user });
    const { entrar, isAutenticado } = await import('../core/state/authStore.js');

    await entrar('user@example.invalid', 'Synthetic-Password-01');

    expect(isAutenticado()).toBe(true);
    expect(storedToken).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalledWith('eduassets_token', expect.anything());
  });

  it('restores an API-validated cookie session after deleting a legacy persisted JWT', async () => {
    storedToken = JSON.stringify({ token: syntheticJwt(), expiresAt: Date.now() + 3_600_000 });
    apiMocks.fetchMe.mockResolvedValueOnce(user);
    const { iniciarSessao, isAutenticado } = await import('../core/state/authStore.js');

    await iniciarSessao();

    expect(apiMocks.fetchMe).toHaveBeenCalledTimes(1);
    expect(isAutenticado()).toBe(true);
    expect(storedToken).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith('eduassets_token');
  });

  it('preserves an explicitly authorized Guest Mode when /auth/me has no session cookie', async () => {
    storedGuestEntry = 'true';
    apiMocks.fetchMe.mockRejectedValueOnce(new Error('no cookie session'));
    const { iniciarSessao, isAcessoConvidadoAutorizado } = await import('../core/state/authStore.js');

    await iniciarSessao();

    expect(isAcessoConvidadoAutorizado()).toBe(true);
  });

  it('clears Guest Mode after cookie login succeeds', async () => {
    const { entrar, entrarComoConvidado, isAcessoConvidadoAutorizado } = await import('../core/state/authStore.js');
    entrarComoConvidado();
    await entrar('user@example.invalid', 'Synthetic-Password-01');

    expect(isAcessoConvidadoAutorizado()).toBe(false);
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('eduassets_guest_entry_authorized');
  });

  it('keeps a pending logout when the API cannot confirm revocation and never restores that session', async () => {
    const first = await import('../core/state/authStore.js');
    await first.entrar('user@example.invalid', 'Synthetic-Password-01');
    await first.sair();
    expect(otherKeys.get('eduassets_logout_pendente')).toBe('true');

    vi.resetModules();
    apiMocks.fetchMe.mockResolvedValue(user);
    const reloaded = await import('../core/state/authStore.js');
    await reloaded.iniciarSessao();

    expect(apiMocks.logoutSession).toHaveBeenCalledTimes(2);
    expect(apiMocks.fetchMe).not.toHaveBeenCalled();
    expect(reloaded.isAutenticado()).toBe(false);
    expect(otherKeys.get('eduassets_logout_pendente')).toBe('true');
  });

  it('settles a pending logout on the next start and only then allows session restore again', async () => {
    otherKeys.set('eduassets_logout_pendente', 'true');
    apiMocks.logoutSession.mockResolvedValueOnce(undefined);
    apiMocks.fetchMe.mockResolvedValue(user);
    const { iniciarSessao, isAutenticado } = await import('../core/state/authStore.js');

    await iniciarSessao();
    expect(apiMocks.logoutSession).toHaveBeenCalledTimes(1);
    expect(apiMocks.fetchMe).not.toHaveBeenCalled();
    expect(isAutenticado()).toBe(false);
    expect(otherKeys.has('eduassets_logout_pendente')).toBe(false);

    await iniciarSessao();
    expect(apiMocks.fetchMe).toHaveBeenCalledTimes(1);
    expect(isAutenticado()).toBe(true);
  });

  it('treats 401 on a pending logout as an already-ended session', async () => {
    otherKeys.set('eduassets_logout_pendente', 'true');
    apiMocks.logoutSession.mockRejectedValueOnce(Object.assign(new Error('expired'), { status: 401 }));
    const { iniciarSessao } = await import('../core/state/authStore.js');

    await iniciarSessao();

    expect(otherKeys.has('eduassets_logout_pendente')).toBe(false);
    expect(apiMocks.fetchMe).not.toHaveBeenCalled();
  });

  it('clears the pending flag after a confirmed logout or a fresh login', async () => {
    apiMocks.logoutSession.mockResolvedValueOnce(undefined);
    const { entrar, sair } = await import('../core/state/authStore.js');
    await entrar('user@example.invalid', 'Synthetic-Password-01');
    await sair();
    expect(otherKeys.has('eduassets_logout_pendente')).toBe(false);

    otherKeys.set('eduassets_logout_pendente', 'true');
    await entrar('user@example.invalid', 'Synthetic-Password-01');
    expect(otherKeys.has('eduassets_logout_pendente')).toBe(false);
  });

  it('keeps senhaAlteradaEm from the login response', async () => {
    apiMocks.login.mockResolvedValueOnce({ user: { ...user, senhaAlteradaEm: '2026-01-02T03:04:05Z' } });
    const { entrar, getUsuario } = await import('../core/state/authStore.js');
    await entrar('user@example.invalid', 'Synthetic-Password-01');
    expect(getUsuario()?.senhaAlteradaEm).toBe('2026-01-02T03:04:05Z');
  });

  it('atualizarUsuarioLocal replaces the profile without notifying subscribers', async () => {
    const { entrar, subscribe, atualizarUsuarioLocal, getUsuario } = await import('../core/state/authStore.js');
    await entrar('user@example.invalid', 'Synthetic-Password-01');
    const listener = vi.fn();
    subscribe(listener);

    atualizarUsuarioLocal({ ...user, senhaAlteradaEm: '2026-05-05T00:00:00Z' });
    expect(getUsuario()?.senhaAlteradaEm).toBe('2026-05-05T00:00:00Z');
    expect(listener).not.toHaveBeenCalled();

    atualizarUsuarioLocal({ ...user, id: 99, senhaAlteradaEm: 'x' });
    expect(getUsuario()?.id).toBe(5);
  });
});
