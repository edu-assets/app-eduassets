// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Emprestimo } from '../types/index.js';

const mocks = vi.hoisted(() => ({
    get: vi.fn(),
    autenticado: false,
    gerarLinhasCsv: vi.fn((_m: Array<Array<string | number>>) => '')
}));

vi.mock('../core/api/apiClient.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../core/api/apiClient.js')>()),
    http: { get: mocks.get }
}));
vi.mock('../core/state/authStore.js', () => ({ isAutenticado: () => mocks.autenticado }));
vi.mock('../core/state/equipamentoStore.js', () => ({ getEquipamentos: () => [] }));
vi.mock('../core/state/ocorrenciasStore.js', () => ({ getOcorrenciasPorTipo: () => [] }));
vi.mock('../core/services/csv.js', () => ({ gerarLinhasCsv: mocks.gerarLinhasCsv, baixarArquivoCsv: vi.fn() }));
vi.mock('../core/services/excel.js', () => ({ gerarArquivoXlsx: vi.fn(), baixarArquivoXlsx: vi.fn() }));
vi.mock('../core/services/pdf.js', () => ({ gerarBaixarPdf: vi.fn() }));

import { ApiError } from '../core/api/apiClient.js';
import {
    listarEmprestimosAbertos,
    listarPaginaEmprestimos,
    listarTodasPaginasEmprestimos,
    limiteDiaLocal,
    redefinirCompatibilidadeEmprestimos
} from '../core/api/emprestimos.js';
import { exportarDados } from '../features/exportar/service.js';

function emprestimo(id: number, status: 'ABERTO' | 'DEVOLVIDO' = 'ABERTO', extra: Partial<Emprestimo> = {}): Emprestimo {
    const data = new Date(Date.UTC(2026, 10, 1, 12) + id * 60_000).toISOString();
    return {
        id, solicitanteNome: 'Convidado', responsavelId: 1, status, dataRetirada: data,
        dataDevolucao: null, observacao: null, createdAt: data, itens: [], ...extra
    };
}

function query(chamada: number): URLSearchParams {
    const caminho = String(mocks.get.mock.calls[chamada][0]);
    return new URLSearchParams(caminho.split('?')[1] ?? '');
}

beforeEach(() => {
    mocks.get.mockReset();
    mocks.gerarLinhasCsv.mockClear();
    mocks.autenticado = false;
    redefinirCompatibilidadeEmprestimos();
});

describe('GET /emprestimos paginado', () => {
    it('convidado: percorre as páginas de status=ABERTO até nextCursor null', async () => {
        mocks.get
            .mockResolvedValueOnce({ items: [emprestimo(9), emprestimo(8)], nextCursor: 8, limit: 100 })
            .mockResolvedValueOnce({ items: [emprestimo(7)], nextCursor: null, limit: 100 });

        const abertos = await listarEmprestimosAbertos(false, { passivo: true });

        expect(abertos.map((e) => e.id)).toEqual([9, 8, 7]);
        expect(mocks.get).toHaveBeenCalledTimes(2);
        expect(Object.fromEntries(query(0))).toEqual({ paginado: '1', limit: '100', status: 'ABERTO' });
        expect(Object.fromEntries(query(1))).toEqual({ paginado: '1', limit: '100', cursor: '8', status: 'ABERTO' });
        expect(mocks.get.mock.calls[0][1]).toEqual({ passivo: true });
    });

    it('convidado: para no teto de páginas e quando o cursor se repete', async () => {
        mocks.get.mockImplementation(async () => ({ items: [emprestimo(1)], nextCursor: 1, limit: 100 }));
        const resultado = await listarTodasPaginasEmprestimos({ autenticado: false }, undefined, 5);
        expect(resultado.completo).toBe(true);
        expect(mocks.get).toHaveBeenCalledTimes(2);

        mocks.get.mockReset();
        let id = 1000;
        mocks.get.mockImplementation(async () => { id -= 1; return { items: [emprestimo(id)], nextCursor: id, limit: 100 }; });
        const truncado = await listarTodasPaginasEmprestimos({ autenticado: false }, undefined, 3);
        expect(truncado).toMatchObject({ completo: false });
        expect(truncado.items).toHaveLength(3);
    });

    it('autenticado: abertos vêm de status=ABERTO sem paginação (array completo)', async () => {
        mocks.get.mockResolvedValueOnce([emprestimo(3), emprestimo(2)]);
        const abertos = await listarEmprestimosAbertos(true);
        expect(abertos.map((e) => e.id)).toEqual([3, 2]);
        expect(mocks.get).toHaveBeenCalledWith('/emprestimos?status=ABERTO', undefined);
    });

    it('envia q só para autenticados e de/ate como dia local com fuso', async () => {
        mocks.get.mockResolvedValue({ items: [], nextCursor: null, limit: 50 });
        const filtros = { q: '  notebook ', de: '2026-11-14', ate: '2026-11-15', status: 'DEVOLVIDO' as const };

        await listarPaginaEmprestimos({ autenticado: true, filtros, cursor: 42 });
        expect(Object.fromEntries(query(0))).toEqual({
            paginado: '1', limit: '50', cursor: '42', status: 'DEVOLVIDO',
            de: limiteDiaLocal('2026-11-14', false), ate: limiteDiaLocal('2026-11-15', true), q: 'notebook'
        });
        expect(limiteDiaLocal('2026-11-14', false)).toMatch(/^2026-11-14T00:00:00\.000[+-]\d{2}:\d{2}$/);
        expect(new Date(limiteDiaLocal('2026-11-14', false)).getTime()).toBe(new Date(2026, 10, 14).getTime());
        expect(new Date(limiteDiaLocal('2026-11-15', true)).getTime()).toBe(new Date(2026, 10, 15, 23, 59, 59, 999).getTime());

        await listarPaginaEmprestimos({ autenticado: false, filtros });
        expect(query(1).has('q')).toBe(false);
    });

    it('resposta em array (API antiga) vira uma página única ordenada', async () => {
        mocks.get.mockResolvedValueOnce([emprestimo(1), emprestimo(3), emprestimo(2)]);
        const pagina = await listarPaginaEmprestimos({ autenticado: true });
        expect(pagina.items.map((e) => e.id)).toEqual([3, 2, 1]);
        expect(pagina.nextCursor).toBeNull();
    });

    it('API antiga (400 por parâmetro desconhecido): repete com os parâmetros legados e filtra localmente', async () => {
        const erro = new ApiError('dados inválidos', 400, {
            erro: 'backend.validacao.dados_invalidos',
            detalhes: [{ campo: '', mensagem: 'Unrecognized key: "paginado"' }]
        });
        mocks.get
            .mockRejectedValueOnce(erro)
            .mockResolvedValueOnce({ items: [emprestimo(5, 'ABERTO'), emprestimo(4, 'DEVOLVIDO')], nextCursor: null, limit: 100 });

        const abertos = await listarEmprestimosAbertos(false);
        expect(abertos.map((e) => e.id)).toEqual([5]);
        expect(Object.fromEntries(query(1))).toEqual({ limit: '100' });

        // Depois de detectada, a API antiga é lida direto com os parâmetros legados.
        mocks.get.mockResolvedValueOnce([emprestimo(6, 'DEVOLVIDO'), emprestimo(7, 'ABERTO')]);
        const abertosAutenticado = await listarEmprestimosAbertos(true);
        expect(mocks.get).toHaveBeenLastCalledWith('/emprestimos', undefined);
        expect(abertosAutenticado.map((e) => e.id)).toEqual([7]);
    });

    it('outros 400 (ex.: cursor desconhecido) não caem na compatibilidade', async () => {
        mocks.get.mockRejectedValueOnce(new ApiError('x', 400, {
            erro: 'backend.validacao.dados_invalidos', detalhes: [{ campo: 'cursor', mensagem: 'Cursor de paginação desconhecido.' }]
        }));
        await expect(listarPaginaEmprestimos({ autenticado: true, cursor: 3 })).rejects.toThrow('x');
        expect(mocks.get).toHaveBeenCalledTimes(1);
    });
});

describe('exportação de empréstimos', () => {
    const base = { tipoDados: 'devolucoes', formato: 'csv', equipamentoIds: [], observacao: '' };

    it('busca todas as páginas do período (paginado=1, limit 100) e mantém a autoria do autenticado', async () => {
        mocks.autenticado = true;
        const autor = { id: 1, nome: 'Zé' };
        mocks.get
            .mockResolvedValueOnce({
                items: [
                    emprestimo(30, 'DEVOLVIDO', { solicitanteNome: 'Ana', criadoPor: autor, devolvidoPor: autor }),
                    emprestimo(29, 'ABERTO', { solicitanteNome: 'Beto', criadoPor: autor, devolvidoPor: null })
                ],
                nextCursor: 29, limit: 100
            })
            .mockResolvedValueOnce({
                items: [emprestimo(28, 'ABERTO', { solicitanteNome: 'Caio', criadoPor: null, devolvidoPor: null })],
                nextCursor: null, limit: 100
            });

        await exportarDados({ ...base, dataInicial: '2026-11-01', dataFinal: '2026-11-30' });

        expect(mocks.get).toHaveBeenCalledTimes(2);
        expect(Object.fromEntries(query(0))).toEqual({
            paginado: '1', limit: '100',
            de: limiteDiaLocal('2026-11-01', false), ate: limiteDiaLocal('2026-11-30', true)
        });
        expect(query(1).get('cursor')).toBe('29');
        expect(query(1).get('de')).toBe(limiteDiaLocal('2026-11-01', false));

        const matriz = mocks.gerarLinhasCsv.mock.calls[0][0];
        expect(matriz[0].slice(-2)).toEqual(['Registrado por', 'Devolvido por']);
        expect(matriz.slice(1).map((linha) => linha[1])).toEqual(['Ana', 'Beto', 'Caio']);
        expect(matriz[1].slice(-2)).toEqual(['Zé', 'Zé']);
        expect(matriz[3].slice(-2)).toEqual(['—', '']);
    });

    it('convidado: sem período percorre as páginas sem filtros e sem colunas de autoria', async () => {
        mocks.get
            .mockResolvedValueOnce({ items: [emprestimo(2)], nextCursor: 2, limit: 100 })
            .mockResolvedValueOnce({ items: [emprestimo(1)], nextCursor: null, limit: 100 });

        await exportarDados({ ...base, dataInicial: '', dataFinal: '' });

        expect(Object.fromEntries(query(0))).toEqual({ paginado: '1', limit: '100' });
        const matriz = mocks.gerarLinhasCsv.mock.calls[0][0];
        expect(matriz[0]).toEqual(['Numero', 'Solicitante', 'Responsavel', 'Retirada', 'Devolucao', 'Status']);
        expect(matriz).toHaveLength(3);
    });

    it('período sem empréstimos continua avisando que não há registros', async () => {
        mocks.get.mockResolvedValueOnce({ items: [], nextCursor: null, limit: 100 });
        await expect(exportarDados({ ...base, dataInicial: '2020-01-01', dataFinal: '2020-01-02' }))
            .rejects.toThrow('Nenhum registro encontrado');
    });
});
