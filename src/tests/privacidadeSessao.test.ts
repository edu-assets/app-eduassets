// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    listeners: [] as Array<(s: { autenticado: boolean; usuario: { id: number } | null }) => void>,
    autenticado: true,
    usuario: { id: 1 } as { id: number } | null,
    listarPaginaEmprestimos: vi.fn(),
    listarEmprestimosAbertos: vi.fn()
}));

vi.mock('../core/state/authStore.js', () => ({
    isAutenticado: () => mocks.autenticado,
    isAcessoConvidadoAutorizado: () => false,
    getUsuario: () => mocks.usuario,
    subscribe: (cb: (typeof mocks.listeners)[number]) => { mocks.listeners.push(cb); return () => undefined; }
}));
vi.mock('../core/state/equipamentoStore.js', () => ({ carregarEquipamentos: vi.fn(async () => []) }));
vi.mock('../core/api/emprestimos.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../core/api/emprestimos.js')>()),
    listarEmprestimosAbertos: mocks.listarEmprestimosAbertos,
    listarPaginaEmprestimos: mocks.listarPaginaEmprestimos
}));

function emitir(autenticado: boolean, usuario: { id: number } | null): void {
    mocks.autenticado = autenticado;
    mocks.usuario = usuario;
    mocks.listeners.forEach((cb) => cb({ autenticado, usuario }));
}

beforeEach(() => {
    vi.resetModules();
    mocks.listeners.length = 0;
    mocks.autenticado = true;
    mocks.usuario = { id: 1 };
    mocks.listarPaginaEmprestimos.mockReset().mockResolvedValue({ items: [], nextCursor: null, limit: 0 });
    mocks.listarEmprestimosAbertos.mockReset().mockResolvedValue([]);
});

describe('privacidade entre sessões', () => {
    it('aoTrocarSessao dispara em logout e troca de usuário, não em atualização de perfil', async () => {
        const { aoTrocarSessao } = await import('../core/state/sessionChange.js');
        const cb = vi.fn();
        aoTrocarSessao(cb);
        emitir(true, { id: 1 });
        expect(cb).not.toHaveBeenCalled();
        emitir(true, { id: 2 });
        expect(cb).toHaveBeenCalledTimes(1);
        emitir(false, null);
        expect(cb).toHaveBeenCalledTimes(2);
    });

    it('limparFiltrosHistorico({ recarregar: false }) zera a busca sem requisição', async () => {
        const store = await import('../core/state/loanStore.js');
        await store.definirFiltrosHistorico({ q: 'segredo', status: 'ABERTO' });
        mocks.listarPaginaEmprestimos.mockClear();
        await store.limparFiltrosHistorico({ recarregar: false });
        expect(store.getFiltrosHistorico()).toEqual({});
        expect(mocks.listarPaginaEmprestimos).not.toHaveBeenCalled();
    });

    it('filtro de devoluções e campo de busca são limpos ao sair', async () => {
        document.body.innerHTML = '<div id="lista"></div>';
        const { montarFerramentasDevolucoes, criarFiltroDevolucoes } = await import('../features/devolucao/filtro.js');
        const { aoTrocarSessao } = await import('../core/state/sessionChange.js');
        const filtro = criarFiltroDevolucoes();
        montarFerramentasDevolucoes(document.getElementById('lista')!, filtro, () => undefined);
        const campo = document.getElementById('devolucao-busca') as HTMLInputElement;
        campo.value = 'x';
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        expect(filtro.termo).toBe('x');
        aoTrocarSessao(() => { filtro.termo = ''; campo.value = ''; });
        emitir(false, null);
        expect(filtro.termo).toBe('');
        expect(campo.value).toBe('');
    });
});
