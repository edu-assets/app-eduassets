import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  autenticado: false,
  loans: [] as unknown[],
  ocorrencias: [] as unknown[],
  gerarLinhasCsv: vi.fn((_m: Array<Array<string | number>>) => '')
}));

vi.mock('../core/state/authStore.js', () => ({ isAutenticado: () => mocks.autenticado }));
vi.mock('../core/state/equipamentoStore.js', () => ({
  getEquipamentos: () => [{ id: 1, modelo: 'M', categoria: { nome: 'A' }, quantidadeTotal: 1, quantidadeDisponivel: 1, quantidadeQuebrada: 0 }]
}));
vi.mock('../core/state/loanStore.js', () => ({ getLoans: () => mocks.loans }));
vi.mock('../core/state/ocorrenciasStore.js', () => ({
  getOcorrenciasPorTipo: (tipo: string) => mocks.ocorrencias.filter((o: any) => o.tipo === tipo)
}));
vi.mock('../core/services/csv.js', () => ({ gerarLinhasCsv: mocks.gerarLinhasCsv, baixarArquivoCsv: vi.fn() }));
vi.mock('../core/services/excel.js', () => ({ gerarArquivoXlsx: vi.fn(), baixarArquivoXlsx: vi.fn() }));
vi.mock('../core/services/pdf.js', () => ({ gerarBaixarPdf: vi.fn() }));

import { exportarDados } from '../features/exportar/service.js';

const base = { dataInicial: '', dataFinal: '', formato: 'csv', equipamentoIds: [], observacao: '' };

describe('exportacao com autoria', () => {
  beforeEach(() => {
    mocks.gerarLinhasCsv.mockClear();
    mocks.loans = [{
      numero: 1, aluno: 'Beto', responsavel: 'Ana', data: '01/01/2026', dataDevolucao: '02/01/2026', status: 'devolvido',
      createdAt: new Date(), criadoPor: { id: 1, nome: 'Zé' }, devolvidoPor: null
    }];
    mocks.ocorrencias = [{
      tipo: 'quebrado', status: 'aberto', equipamentoId: 1, categoria: 'A', modelo: 'M', numero: '1', problema: 'tela',
      descricao: 'd', registradoEm: '01/01/2026', criadoPor: { id: 1, nome: 'Zé' }, resolvidoPor: null
    }];
  });

  it('autenticado: colunas Registrado por / Devolvido por (nulo vira traco)', async () => {
    mocks.autenticado = true;
    await exportarDados({ ...base, tipoDados: 'devolucoes' });
    const m = mocks.gerarLinhasCsv.mock.calls[0][0];
    expect(m[0].slice(-2)).toEqual(['Registrado por', 'Devolvido por']);
    expect(m[1].slice(-2)).toEqual(['Zé', '—']);
  });

  it('convidado: emprestimos sem colunas extras', async () => {
    mocks.autenticado = false;
    await exportarDados({ ...base, tipoDados: 'devolucoes' });
    const m = mocks.gerarLinhasCsv.mock.calls[0][0];
    expect(m[0]).toEqual(['Numero', 'Solicitante', 'Responsavel', 'Retirada', 'Devolucao', 'Status']);
    expect(m[1]).toHaveLength(6);
  });

  it('ocorrencias: Criada por apenas autenticado', async () => {
    mocks.autenticado = true;
    await exportarDados({ ...base, tipoDados: 'equipamentos' });
    let m = mocks.gerarLinhasCsv.mock.calls[0][0];
    expect(m).toContainEqual(['Categoria', 'Modelo', 'Número', 'Problema', 'Descrição', 'Registrado em', 'Criada por']);
    expect(m).toContainEqual(['A', 'M', '1', 'Tela', 'd', '01/01/2026', 'Zé']);

    mocks.autenticado = false;
    mocks.gerarLinhasCsv.mockClear();
    await exportarDados({ ...base, tipoDados: 'equipamentos' });
    m = mocks.gerarLinhasCsv.mock.calls[0][0];
    expect(m).toContainEqual(['Categoria', 'Modelo', 'Número', 'Problema', 'Descrição', 'Registrado em']);
  });
});
