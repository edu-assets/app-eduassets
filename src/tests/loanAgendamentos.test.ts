// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Emprestimo } from '../types/index.js';

const mocks = vi.hoisted(() => ({
    listarEmprestimosAtivos: vi.fn(),
    listarPaginaEmprestimos: vi.fn(),
    confirmarRetiradaEmprestimo: vi.fn(),
    excluirEmprestimo: vi.fn(),
    criarEmprestimo: vi.fn()
}));

vi.mock('../core/state/authStore.js', () => ({
    isAutenticado: () => true, isAcessoConvidadoAutorizado: () => false, getUsuario: () => null, subscribe: () => () => undefined
}));
vi.mock('../core/state/equipamentoStore.js', () => ({ carregarEquipamentos: vi.fn(async () => []) }));
vi.mock('../core/api/emprestimos.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../core/api/emprestimos.js')>()),
    listarEmprestimosAtivos: mocks.listarEmprestimosAtivos,
    listarPaginaEmprestimos: mocks.listarPaginaEmprestimos,
    confirmarRetiradaEmprestimo: mocks.confirmarRetiradaEmprestimo,
    excluirEmprestimo: mocks.excluirEmprestimo,
    criarEmprestimo: mocks.criarEmprestimo
}));

type LoanStore = typeof import('../core/state/loanStore.js');
let store: LoanStore;

function emprestimo(id: number, status: Emprestimo['status'], extra: Partial<Emprestimo> = {}): Emprestimo {
    const data = new Date(Date.UTC(2026, 10, 23, 12) + id * 60_000).toISOString();
    return {
        id, solicitanteNome: `Aluno ${id}`, responsavelId: 1, status, dataRetirada: data,
        dataDevolucao: null, observacao: null, createdAt: data, itens: [], ...extra
    };
}

const agendado = (id: number, inicio: string) => emprestimo(id, 'AGENDADO', {
    dataRetirada: inicio, dataAgendada: inicio, dataPrevistaDevolucao: new Date(new Date(inicio).getTime() + 3_600_000).toISOString()
});

function pagina(items: Emprestimo[], nextCursor: number | null) {
    return { items, nextCursor, limit: items.length };
}

beforeEach(async () => {
    vi.resetModules();
    localStorage.setItem('eduassets_lang', 'pt');
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.listarEmprestimosAtivos.mockResolvedValue([]);
    mocks.listarPaginaEmprestimos.mockResolvedValue(pagina([], null));
    store = await import('../core/state/loanStore.js');
});

describe('abertos x agendamentos no store', () => {
    it('carrega ABERTO e AGENDADO; getLoansAbertos só traz abertos e getAgendamentos ordena por início', async () => {
        mocks.listarEmprestimosAtivos.mockResolvedValue([
            agendado(3, '2026-11-26T15:00:00.000Z'),
            emprestimo(1, 'ABERTO'),
            agendado(2, '2026-11-25T09:00:00.000Z')
        ]);
        await store.carregarEmprestimos();

        expect(store.getLoansAbertos().map((l) => l.id)).toEqual([1]);
        expect(store.getAgendamentos().map((l) => l.id)).toEqual([2, 3]);
        expect(store.getLoansAtivos()).toHaveLength(3);
        expect(mocks.listarEmprestimosAtivos).toHaveBeenCalledWith(true, undefined);
    });

    it('um agendamento excluído em outro lugar some na recarga (sincronização ao vivo)', async () => {
        mocks.listarEmprestimosAtivos.mockResolvedValue([agendado(2, '2026-11-25T09:00:00.000Z'), agendado(3, '2026-11-26T15:00:00.000Z')]);
        await store.carregarEmprestimos();
        const avisos = vi.fn();
        store.subscribe(avisos);

        mocks.listarEmprestimosAtivos.mockResolvedValue([agendado(3, '2026-11-26T15:00:00.000Z')]);
        await store.carregarEmprestimos({ passivo: true });

        expect(store.getAgendamentos().map((l) => l.id)).toEqual([3]);
        expect(avisos).toHaveBeenCalledTimes(1);
    });
});

describe('ações de agendamento', () => {
    it('confirmarRetirada: o item passa de agendamento para aberto, o histórico é corrigido e os assinantes são avisados', async () => {
        const inicio = '2026-11-25T09:00:00.000Z';
        mocks.listarEmprestimosAtivos.mockResolvedValue([agendado(2, inicio)]);
        mocks.listarPaginaEmprestimos.mockResolvedValue(pagina([agendado(2, inicio)], null));
        await store.carregarEmprestimos();
        const avisos = vi.fn();
        store.subscribe(avisos);

        const confirmado = emprestimo(2, 'ABERTO', { dataAgendada: inicio, dataRetirada: '2026-11-25T09:10:00.000Z', dataPrevistaDevolucao: '2026-11-25T10:00:00.000Z' });
        mocks.confirmarRetiradaEmprestimo.mockResolvedValue(confirmado);
        // Depois da confirmação o servidor já devolve o empréstimo como ABERTO.
        mocks.listarEmprestimosAtivos.mockResolvedValue([confirmado]);
        mocks.listarPaginaEmprestimos.mockResolvedValue(pagina([confirmado], null));

        await store.confirmarRetirada(2);

        expect(mocks.confirmarRetiradaEmprestimo).toHaveBeenCalledWith(2);
        expect(store.getAgendamentos()).toEqual([]);
        expect(store.getLoansAbertos().map((l) => l.id)).toEqual([2]);
        expect(store.getHistorico().items[0]).toMatchObject({ id: 2, status: 'aberto', data: '2026-11-25T09:10:00.000Z' });
        expect(avisos).toHaveBeenCalled();
    });

    it('falha ao confirmar (409) não altera o estado e propaga o erro', async () => {
        mocks.listarEmprestimosAtivos.mockResolvedValue([agendado(2, '2026-11-25T09:00:00.000Z')]);
        await store.carregarEmprestimos();
        mocks.confirmarRetiradaEmprestimo.mockRejectedValue(new Error('backend.emprestimos.unidades_nao_devolvidas'));
        await expect(store.confirmarRetirada(2)).rejects.toThrow('unidades_nao_devolvidas');
        expect(store.getAgendamentos().map((l) => l.id)).toEqual([2]);
    });

    it('excluirAgendamento: remove na hora de agendamentos e do histórico', async () => {
        const inicio = '2026-11-25T09:00:00.000Z';
        mocks.listarEmprestimosAtivos.mockResolvedValue([agendado(2, inicio), agendado(3, '2026-11-26T09:00:00.000Z')]);
        mocks.listarPaginaEmprestimos.mockResolvedValue(pagina([agendado(3, '2026-11-26T09:00:00.000Z'), agendado(2, inicio)], null));
        await store.carregarEmprestimos();
        const avisos = vi.fn();
        store.subscribe(avisos);
        mocks.excluirEmprestimo.mockResolvedValue(undefined);
        mocks.listarEmprestimosAtivos.mockResolvedValue([agendado(3, '2026-11-26T09:00:00.000Z')]);
        mocks.listarPaginaEmprestimos.mockResolvedValue(pagina([agendado(3, '2026-11-26T09:00:00.000Z')], null));

        await store.excluirAgendamento(2);

        expect(mocks.excluirEmprestimo).toHaveBeenCalledWith(2);
        expect(store.getAgendamentos().map((l) => l.id)).toEqual([3]);
        expect(store.getHistorico().items.map((l) => l.id)).toEqual([3]);
        expect(avisos).toHaveBeenCalled();
    });

    it('excluirEmprestimo (ABERTO): remove das listas ativa e do histórico e recarrega (disponibilidade)', async () => {
        mocks.listarEmprestimosAtivos.mockResolvedValue([emprestimo(1, 'ABERTO'), emprestimo(2, 'ABERTO')]);
        mocks.listarPaginaEmprestimos.mockResolvedValue(pagina([emprestimo(2, 'ABERTO'), emprestimo(1, 'ABERTO')], null));
        await store.carregarEmprestimos();
        mocks.excluirEmprestimo.mockResolvedValue(undefined);
        mocks.listarEmprestimosAtivos.mockClear();
        mocks.listarEmprestimosAtivos.mockResolvedValue([emprestimo(2, 'ABERTO')]);
        mocks.listarPaginaEmprestimos.mockResolvedValue(pagina([emprestimo(2, 'ABERTO')], null));

        await store.excluirEmprestimo(1);

        expect(mocks.excluirEmprestimo).toHaveBeenCalledWith(1);
        expect(store.getLoansAbertos().map((l) => l.id)).toEqual([2]);
        expect(store.getHistorico().items.map((l) => l.id)).toEqual([2]);
        expect(mocks.listarEmprestimosAtivos).toHaveBeenCalled();
    });

    it('excluirEmprestimo com erro do servidor (403) mantém o empréstimo e propaga', async () => {
        mocks.listarEmprestimosAtivos.mockResolvedValue([emprestimo(1, 'ABERTO')]);
        await store.carregarEmprestimos();
        mocks.excluirEmprestimo.mockRejectedValue(new Error('backend.emprestimos.exclusao_fora_do_prazo'));
        await expect(store.excluirEmprestimo(1)).rejects.toThrow('fora_do_prazo');
        expect(store.getLoansAbertos().map((l) => l.id)).toEqual([1]);
    });

    it('addLoan envia dataPrevistaDevolucao e devolve o registro criado', async () => {
        const criado = agendado(9, '2026-11-25T09:00:00.000Z');
        mocks.criarEmprestimo.mockResolvedValue(criado);
        const r = await store.addLoan({
            aluno: 'Ana', responsavelId: '1', itens: [{ id: 4, nome: 'Notebook', quantidade: 2 }],
            dataRetiradaISO: '2026-11-25T09:00:00.000Z', dataPrevistaDevolucaoISO: '2026-11-25T10:00:00.000Z'
        });
        expect(mocks.criarEmprestimo).toHaveBeenCalledWith(expect.objectContaining({
            dataRetirada: '2026-11-25T09:00:00.000Z', dataPrevistaDevolucao: '2026-11-25T10:00:00.000Z',
            itens: [{ equipamentoId: 4, quantidade: 2 }]
        }));
        expect(r).toBe(criado);
    });
});

describe('histórico: dedupe por id', () => {
    it('"Carregar mais" não duplica um item que mudou de posição (confirmação altera dataRetirada)', async () => {
        const primeira = Array.from({ length: 50 }, (_, i) => emprestimo(100 - i, 'DEVOLVIDO')); // 100..51
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina(primeira, 51));
        await store.carregarEmprestimos();
        // A página seguinte repete o id 51 (cujo dataRetirada mudou) além de um item novo.
        mocks.listarPaginaEmprestimos.mockResolvedValueOnce(pagina([emprestimo(51, 'ABERTO'), emprestimo(50, 'DEVOLVIDO')], null));
        await store.carregarMaisHistorico();
        const ids = store.getHistorico().items.map((l) => l.id);
        expect(ids).toHaveLength(51);
        expect(new Set(ids).size).toBe(51);
        expect(ids.slice(-2)).toEqual([51, 50]);
    });
});
