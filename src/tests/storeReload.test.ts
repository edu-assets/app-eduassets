import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    listarEquipamentos: vi.fn(async () => []),
    listarEmprestimos: vi.fn(async () => []),
    listarPaginaEmprestimos: vi.fn(async () => ({ items: [], nextCursor: null, limit: 50 })),
    criarEmprestimo: vi.fn(async () => ({})),
    atualizarItensEmprestimo: vi.fn(async () => ({})),
    devolverEmprestimo: vi.fn(async () => ({})),
    listarOcorrencias: vi.fn(async () => []),
    criarOcorrencia: vi.fn(async () => []),
    atualizarOcorrencia: vi.fn(async () => ({})),
    resolverOcorrencia: vi.fn(async () => ({})),
    excluirOcorrencia: vi.fn(async () => undefined)
}));

vi.mock('../core/api/equipamentos.js', () => ({
    listarEquipamentos: mocks.listarEquipamentos,
    atualizarEquipamento: vi.fn()
}));
vi.mock('../core/state/authStore.js', () => ({ isAutenticado: () => true }));
// `listarEmprestimos` = leitura dos empréstimos abertos (uma por recarga).
vi.mock('../core/api/emprestimos.js', () => ({
    listarEmprestimosAbertos: mocks.listarEmprestimos,
    listarPaginaEmprestimos: mocks.listarPaginaEmprestimos,
    normalizarFiltros: (f: object) => f,
    LIMITE_PAGINA_PADRAO: 50,
    LIMITE_PAGINA_MAXIMO: 100,
    MAX_PAGINAS: 200,
    criarEmprestimo: mocks.criarEmprestimo,
    atualizarItensEmprestimo: mocks.atualizarItensEmprestimo,
    devolverEmprestimo: mocks.devolverEmprestimo
}));
vi.mock('../core/api/ocorrencias.js', () => ({
    listarOcorrencias: mocks.listarOcorrencias,
    criarOcorrencia: mocks.criarOcorrencia,
    atualizarOcorrencia: mocks.atualizarOcorrencia,
    resolverOcorrencia: mocks.resolverOcorrencia,
    excluirOcorrencia: mocks.excluirOcorrencia
}));

import { addLoan, returnLoan, updateLoan } from '../core/state/loanStore.js';
import { addOcorrencia, updateOcorrencia, resolveOcorrencia, deleteOcorrencia } from '../core/state/ocorrenciasStore.js';

describe('operations that change stock also reload the equipment store', () => {
    beforeEach(() => {
        Object.values(mocks).forEach((mock) => mock.mockClear());
    });

    it('addLoan reloads loans and equipment', async () => {
        await addLoan({ aluno: 'Ana', responsavelId: '1', itens: [{ id: 2, nome: 'Notebook', quantidade: 1 }], observacao: '' });
        expect(mocks.listarEmprestimos).toHaveBeenCalledTimes(1);
        expect(mocks.listarEquipamentos).toHaveBeenCalledTimes(1);
    });

    it('returnLoan reloads loans and equipment', async () => {
        await returnLoan(5, '2026-11-12T12:00:00.000Z');
        expect(mocks.devolverEmprestimo).toHaveBeenCalledWith(5, '2026-11-12T12:00:00.000Z');
        expect(mocks.listarEmprestimos).toHaveBeenCalledTimes(1);
        expect(mocks.listarEquipamentos).toHaveBeenCalledTimes(1);
    });

    it('returnLoan without a date (automatic field) sends no date at all', async () => {
        await returnLoan(5);
        expect(mocks.devolverEmprestimo).toHaveBeenCalledWith(5, undefined);
    });

    it('updateLoan reloads loans and equipment', async () => {
        await updateLoan(5, { itens: [{ id: 2, nome: 'Notebook', quantidade: 2 }] });
        expect(mocks.listarEmprestimos).toHaveBeenCalledTimes(1);
        expect(mocks.listarEquipamentos).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['addOcorrencia', () => addOcorrencia({ equipamentoId: 1, tipo: 'QUEBRADO', problema: 'x', descricao: 'y', numeros: ['1'] })],
        ['updateOcorrencia', () => updateOcorrencia(1, { problema: 'x' })],
        ['resolveOcorrencia', () => resolveOcorrencia(1, 'trocado')],
        ['deleteOcorrencia', () => deleteOcorrencia(1)]
    ])('%s reloads occurrences and equipment', async (_nome, operacao) => {
        await operacao();
        expect(mocks.listarOcorrencias).toHaveBeenCalledTimes(1);
        expect(mocks.listarEquipamentos).toHaveBeenCalledTimes(1);
    });

    it('a failure refreshing equipment after a successful operation does not look like a failed operation', async () => {
        mocks.listarEquipamentos.mockRejectedValueOnce(new Error('rede'));
        await expect(returnLoan(5)).resolves.not.toBeInstanceOf(Error);
        expect(mocks.listarEmprestimos).toHaveBeenCalledTimes(1);
    });

    it('a failed operation reloads nothing', async () => {
        mocks.devolverEmprestimo.mockRejectedValueOnce(new Error('ja devolvido'));
        await expect(returnLoan(5)).rejects.toThrow('ja devolvido');
        expect(mocks.listarEmprestimos).not.toHaveBeenCalled();
        expect(mocks.listarEquipamentos).not.toHaveBeenCalled();
    });
});
