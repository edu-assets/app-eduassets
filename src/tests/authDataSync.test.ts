import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authListener: undefined as undefined | ((state: { autenticado: boolean; usuario: unknown }) => void),
  isAuthenticated: vi.fn(() => false),
  clearEquipment: vi.fn(),
  clearLoans: vi.fn(),
  clearOccurrences: vi.fn(),
  clearResponsible: vi.fn(),
  loadEquipment: vi.fn(() => Promise.resolve([])),
  loadLoans: vi.fn(() => Promise.resolve([])),
  loadOccurrences: vi.fn(() => Promise.resolve([])),
  loadResponsible: vi.fn(() => Promise.resolve([])),
  showToast: vi.fn(),
}));

vi.mock('../core/state/authStore.js', () => ({
  isAutenticado: mocks.isAuthenticated,
  subscribe: (listener: typeof mocks.authListener) => {
    mocks.authListener = listener;
    return () => { mocks.authListener = undefined; };
  },
}));

vi.mock('../core/state/index.js', () => ({
  carregarEquipamentos: mocks.loadEquipment,
  limparEquipamentos: mocks.clearEquipment,
  carregarEmprestimos: mocks.loadLoans,
  limparEmprestimos: mocks.clearLoans,
  carregarOcorrencias: mocks.loadOccurrences,
  limparOcorrencias: mocks.clearOccurrences,
  carregarResponsaveis: mocks.loadResponsible,
  limparResponsaveis: mocks.clearResponsible,
}));

vi.mock('../core/ui/index.js', () => ({ showToast: mocks.showToast }));
vi.mock('../core/state/i18nStore.js', () => ({ t: (key: string) => key }));

describe('auth-driven data synchronization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.authListener = undefined;
    mocks.isAuthenticated.mockReturnValue(false);
  });

  it('Guest loads public stores only and never requests responsible parties', async () => {
    const { initAuthDataSync } = await import('../core/state/authDataSync.js');
    await initAuthDataSync();

    expect(mocks.loadEquipment).toHaveBeenCalledTimes(1);
    expect(mocks.loadLoans).toHaveBeenCalledTimes(1);
    expect(mocks.loadOccurrences).toHaveBeenCalledTimes(1);
    expect(mocks.loadResponsible).not.toHaveBeenCalled();
    expect(mocks.clearResponsible).toHaveBeenCalledTimes(1);
  });

  it('Editor/Admin login reloads authorized stores without a browser refresh, and logout clears them immediately', async () => {
    const { initAuthDataSync } = await import('../core/state/authDataSync.js');
    await initAuthDataSync();
    const emit = mocks.authListener;
    expect(emit).toBeTypeOf('function');

    emit?.({ autenticado: true, usuario: { id: 10, nivelAcesso: 'EDITOR' } });
    expect(mocks.loadResponsible).toHaveBeenCalledTimes(1);
    expect(mocks.loadLoans).toHaveBeenCalledTimes(2);
    expect(mocks.loadOccurrences).toHaveBeenCalledTimes(2);

    emit?.({ autenticado: true, usuario: { id: 11, nivelAcesso: 'ADMINISTRADOR' } });
    expect(mocks.loadResponsible).toHaveBeenCalledTimes(2);

    emit?.({ autenticado: false, usuario: null });
    // Store clearing runs synchronously inside the auth notification, before Guest refetches complete.
    expect(mocks.clearEquipment).toHaveBeenCalledTimes(4);
    expect(mocks.clearLoans).toHaveBeenCalledTimes(4);
    expect(mocks.clearOccurrences).toHaveBeenCalledTimes(4);
    expect(mocks.clearResponsible).toHaveBeenCalledTimes(4);
    expect(mocks.loadResponsible).toHaveBeenCalledTimes(2);
    expect(mocks.loadLoans).toHaveBeenCalledTimes(4);
  });
});
