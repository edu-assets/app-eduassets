// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  getUsuario: vi.fn(),
  atualizarUsuarioLocal: vi.fn(),
}));

vi.mock('../core/api/auth.js', () => ({ fetchMe: mocks.fetchMe }));
vi.mock('../core/state/authStore.js', () => ({
  getUsuario: mocks.getUsuario,
  atualizarUsuarioLocal: mocks.atualizarUsuarioLocal,
}));
vi.mock('../core/ui/index.js', () => ({ showToast: vi.fn() }));
vi.mock('../core/state/i18nStore.js', () => ({ formatarDataHora: (v: unknown) => (typeof v === 'string' ? v : ''), getLocale: () => 'pt-BR', t: (k: string) => k, getIdioma: () => 'pt', traduzirErro: () => 'erro' }));
vi.mock('../core/auth/guestGate.js', () => ({ bloquearSeConvidado: () => false }));

describe('Segurança: após trocar a senha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('atualiza só o painel, sem notificação global de autenticação', async () => {
    const atual = { id: 1, login: 'a@b.com', senhaAlteradaEm: null };
    const novo = { id: 1, login: 'a@b.com', senhaAlteradaEm: '2026-03-04T10:00:00Z' };
    mocks.getUsuario.mockReturnValueOnce(atual).mockReturnValue(novo);
    mocks.fetchMe.mockResolvedValue(novo);
    const email = document.createElement('span');
    const data = document.createElement('span');
    const { atualizarPainelAposTroca } = await import('../features/seguranca/events.js');

    await atualizarPainelAposTroca({ email, senhaAlteradaEm: data } as never);

    expect(mocks.atualizarUsuarioLocal).toHaveBeenCalledWith(novo);
    expect(email.textContent).toBe('a@b.com');
    expect(data.textContent).not.toBe('shell.sem_registro');
  });

  it('usa a data local quando /auth/me falha', async () => {
    const atual = { id: 1, login: 'a@b.com', senhaAlteradaEm: null };
    mocks.getUsuario.mockReturnValue(atual);
    mocks.fetchMe.mockRejectedValue(new Error('offline'));
    const { atualizarPainelAposTroca } = await import('../features/seguranca/events.js');

    await atualizarPainelAposTroca({ email: null, senhaAlteradaEm: null } as never);

    expect(mocks.atualizarUsuarioLocal).toHaveBeenCalledWith(expect.objectContaining({ id: 1, senhaAlteradaEm: expect.any(String) }));
  });
});
