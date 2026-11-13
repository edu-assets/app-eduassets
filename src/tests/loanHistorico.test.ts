// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Emprestimo } from '../types/index.js';

const mocks = vi.hoisted(() => ({
    autenticado: true,
    listarEmprestimosAbertos: vi.fn(),
    listarPaginaEmprestimos: vi.fn()
}));

vi.mock('../core/state/authStore.js', () => ({
    isAutenticado: () => mocks.autenticado,
    isAcessoConvidadoAutorizado: () => false,
    getUsuario: () => null,
    subscribe: () => () => undefined
}));
vi.mock('../core/state/equipamentoStore.js', () => ({ carregarEquipamentos: vi.fn(async () => []) }));
vi.mock('../core/api/emprestimos.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../core/api/emprestimos.js')>()),
    listarEmprestimosAbertos: mocks.listarEmprestimosAbertos,
    listarPaginaEmprestimos: mocks.listarPaginaEmprestimos
}));

type LoanStore = typeof import('../core/state/loanStore.js');
type LoadStatus = typeof import('../core/state/loadStatus.js');
let store: LoanStore;
let loadStatus: LoadStatus;

function emprestimo(id: number, status: 'ABERTO' | 'DEVOLVIDO' = 'DEVOLVIDO'): Emprestimo {
    const data = new Date(Date.UTC(2026, 0, 1, 12) + id * 60_000).toISOString();
    return {
        id, solicitanteNome: `Aluno ${id}`, responsavelId: 1, status, dataRetirada: data,
        dataDevolucao: null, observacao: null, createdAt: data, itens: []
    };
}

/** ids decrescentes a partir de `inicio` (ordem do histórico). */
function lote(inicio: number, quantidade: number): Emprestimo[] {
    return Array.from({ length: quantidade }, (_, i) => emprestimo(inicio - i));
}

function pagina(items: Emprestimo[], nextCursor: number | null) {
    return { items, nextCursor, limit: items.length };
}

beforeEach(async () => {
    vi.resetModules();
    localStorage.setItem('eduassets_lang', 'pt');
    mocks.autenticado = true;
    mocks.listarEmprestimosAbertos.mockReset().mockResolvedValue([]);
    mocks.listarPaginaEmprestimos.mockReset();
    store = await import('../core/state/loanStore.js');
    loadStatus = await import('../core/state/loadStatus.js');
});

describe('histórico paginado no store', () => {
    it('carga inicial: abertos completos + primeira página; "Carregar mais" anexa a próxima página', async () => {
        mocks.listarEmprestimosAbertos.mockResolvedValue([emprestimo(500, 'ABERTO')]);
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(200, 50), 151));
        await store.carregarEmprestimos();

        expect(store.getLoansAbertos().map((l) => l.id)).toEqual([500]);
        expect(store.getHistorico().items).toHaveLength(50);
        expect(store.temMaisHistorico()).toBe(true);
        expect(mocks.listarPaginaEmprestimos).toHaveBeenLastCalledWith(
            expect.objectContaining({ cursor: null, limit: 50, filtros: {}, autenticado: true }), undefined
        );

        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(150, 20), null));
        const promessa = store.carregarMaisHistorico();
        expect(store.getHistorico().carregando).toBe(true);
        await promessa;

        expect(mocks.listarPaginaEmprestimos).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 151, limit: 50 }));
        const historico = store.getHistorico();
        expect(historico.items).toHaveLength(70);
        expect(historico.items[50].id).toBe(150);
        expect(historico.nextCursor).toBeNull();
        expect(historico.carregando).toBe(false);
        expect(store.temMaisHistorico()).toBe(false);

        // Sem nextCursor, "Carregar mais" não faz requisição.
        await store.carregarMaisHistorico();
        expect(mocks.listarPaginaEmprestimos).toHaveBeenCalledTimes(2);
    });

    it('falha ao carregar mais mantém os itens e expõe o erro', async () => {
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(100, 50), 51));
        await store.carregarEmprestimos();
        mocks.listarPaginaEmprestimos.mockRejectedValueOnce(new Error('rede'));
        await store.carregarMaisHistorico();
        expect(store.getHistorico()).toMatchObject({ erro: 'rede', carregando: false, nextCursor: 51 });
        expect(store.getHistorico().items).toHaveLength(50);
    });

    it('trocar filtros descarta as páginas e recarrega a página 1; filtros iguais não recarregam', async () => {
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(200, 50), 151));
        await store.carregarEmprestimos();
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(150, 50), 101));
        await store.carregarMaisHistorico();
        expect(store.getHistorico().items).toHaveLength(100);

        let resolver!: (valor: unknown) => void;
        mocks.listarPaginaEmprestimos.mockReturnValueOnce(new Promise((res) => { resolver = res; }));
        const promessa = store.definirFiltrosHistorico({ status: 'DEVOLVIDO', de: '2026-01-01', q: '  ana  ' });
        expect(store.getHistorico()).toMatchObject({ items: [], nextCursor: null, carregando: true });
        expect(store.getFiltrosHistorico()).toEqual({ status: 'DEVOLVIDO', de: '2026-01-01', q: 'ana' });
        resolver(pagina(lote(90, 10), null));
        await promessa;

        expect(mocks.listarPaginaEmprestimos.mock.lastCall?.[0].cursor).toBeUndefined();
        expect(mocks.listarPaginaEmprestimos).toHaveBeenLastCalledWith(expect.objectContaining({
            limit: 50, filtros: { status: 'DEVOLVIDO', de: '2026-01-01', q: 'ana' }
        }));
        expect(store.getHistorico()).toMatchObject({ nextCursor: null, carregando: false });
        expect(store.getHistorico().items.map((l) => l.id)[0]).toBe(90);

        const chamadas = mocks.listarPaginaEmprestimos.mock.calls.length;
        await store.definirFiltrosHistorico({ q: 'ana' });
        expect(mocks.listarPaginaEmprestimos).toHaveBeenCalledTimes(chamadas);

        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(200, 50), 151));
        await store.limparFiltrosHistorico();
        expect(store.getFiltrosHistorico()).toEqual({});
        expect(store.getHistorico().items).toHaveLength(50);
    });

    it('página "Carregar mais" pedida antes de uma troca de filtros é descartada', async () => {
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(200, 50), 151));
        await store.carregarEmprestimos();

        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina([emprestimo(7, 'ABERTO')], null));
        const mais = store.carregarMaisHistorico();
        const filtro = store.definirFiltrosHistorico({ status: 'ABERTO' });
        await Promise.all([mais, filtro]);

        // A página antiga nem chega a ser pedida: só a primeira página do novo filtro.
        expect(mocks.listarPaginaEmprestimos).toHaveBeenCalledTimes(2);
        expect(mocks.listarPaginaEmprestimos).toHaveBeenLastCalledWith(expect.objectContaining({ filtros: { status: 'ABERTO' } }));
        expect(store.getHistorico()).toMatchObject({ nextCursor: null, carregando: false });
        expect(store.getHistorico().items.map((l) => l.id)).toEqual([7]);
    });

    it('convidado: mudar só a busca não faz requisição (a tela filtra localmente)', async () => {
        mocks.autenticado = false;
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(10, 10), null));
        await store.carregarEmprestimos();
        const ouvinte = vi.fn();
        store.subscribeHistorico(ouvinte);
        await store.definirFiltrosHistorico({ q: 'Aluno 3' });
        expect(mocks.listarPaginaEmprestimos).toHaveBeenCalledTimes(1);
        expect(store.getFiltrosHistorico().q).toBe('Aluno 3');
        expect(ouvinte).toHaveBeenCalled();
        expect(store.getHistorico().items).toHaveLength(10);
    });
});

describe('sincronização ao vivo do histórico', () => {
    it('com só a primeira página, atualiza a primeira página (passiva) sem esqueleto', async () => {
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(200, 50), 151));
        await store.carregarEmprestimos();
        const eventos: string[] = [];
        loadStatus.subscribeLoadStatus((chave, s) => { if (chave === 'emprestimos') eventos.push(s.status); });

        mocks.listarEmprestimosAbertos.mockResolvedValue([emprestimo(201, 'ABERTO')]);
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(201, 50), 152));
        await store.carregarEmprestimos({ passivo: true });

        expect(mocks.listarEmprestimosAbertos).toHaveBeenLastCalledWith(true, { passivo: true });
        expect(mocks.listarPaginaEmprestimos).toHaveBeenLastCalledWith(
            expect.objectContaining({ cursor: null, limit: 50 }), { passivo: true }
        );
        expect(store.getLoansAbertos().map((l) => l.id)).toEqual([201]);
        expect(store.getHistorico().items[0].id).toBe(201);
        expect(store.getHistorico().items).toHaveLength(50);
        expect(store.getHistorico().nextCursor).toBe(152);
        expect(eventos).toEqual([]);
        expect(loadStatus.getLoadStatus('emprestimos').status).toBe('pronto');
    });

    it('com páginas extras carregadas, recarrega a mesma quantidade (páginas de até 100)', async () => {
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(300, 50), 251));
        await store.carregarEmprestimos();
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(250, 50), 201));
        await store.carregarMaisHistorico();
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(200, 50), 151));
        await store.carregarMaisHistorico();
        expect(store.getHistorico().items).toHaveLength(150);

        mocks.listarPaginaEmprestimos.mockClear();
        mocks.listarPaginaEmprestimos
            .mockResolvedValueOnce(pagina(lote(301, 100), 202))
            .mockResolvedValueOnce(pagina(lote(201, 50), 152));
        await store.carregarEmprestimos({ passivo: true });

        expect(mocks.listarPaginaEmprestimos.mock.calls.map(([c]) => [c.cursor, c.limit])).toEqual([[null, 100], [202, 50]]);
        const historico = store.getHistorico();
        expect(historico.items).toHaveLength(150);
        expect(historico.items[0].id).toBe(301);
        expect(historico.nextCursor).toBe(152);
    });

    it('falha passiva mantém os itens e o estado pronto', async () => {
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(100, 50), 51));
        await store.carregarEmprestimos();
        mocks.listarPaginaEmprestimos.mockRejectedValueOnce(new Error('rede'));
        await expect(store.carregarEmprestimos({ passivo: true })).rejects.toThrow('rede');
        expect(store.getHistorico().items).toHaveLength(50);
        expect(loadStatus.getLoadStatus('emprestimos').status).toBe('pronto');
    });
});

describe('Dashboard › Histórico: contagem e "Carregar mais"', () => {
    function els() {
        const btn = document.createElement('button');
        return {
            historicoLista: document.createElement('div'),
            historicoVazio: document.createElement('div'),
            historicoPaginacao: document.createElement('div'),
            historicoContagem: document.createElement('span'),
            btnCarregarMais: btn
        };
    }

    it('mostra "Mostrando N empréstimos" e esconde o botão quando nextCursor é null', async () => {
        const { renderHistorico } = await import('../features/dashboard/render.js');
        type Els = Parameters<typeof renderHistorico>[0];
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(100, 50), 51));
        await store.carregarEmprestimos();
        const e = els();
        renderHistorico(e as unknown as Els, store.getHistorico().items, store.getHistorico());
        expect(e.historicoPaginacao.hidden).toBe(false);
        expect(e.historicoContagem.textContent).toBe('Mostrando 50 empréstimos');
        expect(e.btnCarregarMais.hidden).toBe(false);
        expect(e.historicoLista.querySelectorAll('.historico-row').length).toBe(50);

        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina([emprestimo(50)], null));
        await store.carregarMaisHistorico();
        renderHistorico(e as unknown as Els, store.getHistorico().items, store.getHistorico());
        expect(e.historicoContagem.textContent).toBe('Mostrando 51 empréstimos');
        expect(e.btnCarregarMais.hidden).toBe(true);
    });

    it('troca de filtros sem itens mostra esqueleto e esconde a paginação', async () => {
        const { renderHistorico } = await import('../features/dashboard/render.js');
        type Els = Parameters<typeof renderHistorico>[0];
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(lote(100, 50), 51));
        await store.carregarEmprestimos();
        mocks.listarPaginaEmprestimos.mockReturnValueOnce(new Promise(() => undefined));
        void store.definirFiltrosHistorico({ status: 'ABERTO' });
        const e = els();
        renderHistorico(e as unknown as Els, store.getHistorico().items, store.getHistorico());
        expect(e.historicoLista.getAttribute('aria-busy')).toBe('true');
        expect(e.historicoPaginacao.hidden).toBe(true);
    });
});
