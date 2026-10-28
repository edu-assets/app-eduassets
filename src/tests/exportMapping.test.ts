import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  equipamentos: [] as unknown[],
  loans: [] as unknown[],
  ocorrencias: [] as unknown[],
  baixarArquivoCsv: vi.fn(),
  gerarLinhasCsv: vi.fn((_matriz: Array<Array<string | number>>) => '')
}));

vi.mock('../core/state/equipamentoStore.js', () => ({ getEquipamentos: () => mocks.equipamentos }));
vi.mock('../core/state/loanStore.js', () => ({ getLoans: () => mocks.loans }));
vi.mock('../core/state/ocorrenciasStore.js', () => ({
  getOcorrenciasPorTipo: (tipo: string) => mocks.ocorrencias.filter((o: any) => o.tipo === tipo)
}));
vi.mock('../core/services/csv.js', () => ({
  gerarLinhasCsv: mocks.gerarLinhasCsv,
  baixarArquivoCsv: mocks.baixarArquivoCsv
}));
vi.mock('../core/services/excel.js', () => ({ gerarArquivoXlsx: vi.fn(), baixarArquivoXlsx: vi.fn() }));
vi.mock('../core/services/pdf.js', () => ({ gerarBaixarPdf: vi.fn() }));

import { exportarDados } from '../features/exportar/service.js';

describe('exportarDados CSV mapping', () => {
  beforeEach(() => {
    mocks.equipamentos = [];
    mocks.loans = [];
    mocks.ocorrencias = [];
    mocks.baixarArquivoCsv.mockClear();
    mocks.gerarLinhasCsv.mockClear();
  });

  it('keeps equipment columns aligned, including local maintenance count', async () => {
    mocks.equipamentos = [{
      id: 10, modelo: 'Notebook X', categoria: { nome: 'Informática' },
      quantidadeTotal: 8, quantidadeDisponivel: 5, quantidadeQuebrada: 1
    }];
    mocks.ocorrencias = [{ tipo: 'manutencao', equipamentoId: 10 }];

    await exportarDados({ tipoDados: 'equipamentos', dataInicial: '', dataFinal: '', formato: 'csv', equipamentoIds: [], observacao: '' });

    const matriz = mocks.gerarLinhasCsv.mock.calls[0][0];
    expect(matriz[0]).toEqual(['Categoria', 'Modelo', 'Total', 'Disponivel', 'Em Manutencao', 'Quebrado']);
    expect(matriz[1]).toEqual(['Informática', 'Notebook X', 8, 5, 1, 1]);
  });

  it('keeps occurrence detail fields aligned with their headers', async () => {
    mocks.equipamentos = [{
      id: 11, modelo: 'Tablet Y', categoria: { nome: 'Aulas' },
      quantidadeTotal: 2, quantidadeDisponivel: 2, quantidadeQuebrada: 0
    }];
    mocks.ocorrencias = [{
      tipo: 'quebrado', equipamentoId: 11, categoria: 'Aulas', modelo: 'Tablet Y', numero: 'T-7',
      problema: 'tela', descricao: 'Tela rachada', registradoEm: '28/10/2026'
    }];

    await exportarDados({ tipoDados: 'equipamentos', dataInicial: '', dataFinal: '', formato: 'csv', equipamentoIds: [], observacao: '' });

    const matriz = mocks.gerarLinhasCsv.mock.calls[0][0];
    expect(matriz).toContainEqual(['Categoria', 'Modelo', 'Número', 'Problema', 'Descrição', 'Registrado em']);
    expect(matriz).toContainEqual(['Aulas', 'Tablet Y', 'T-7', 'Tela', 'Tela rachada', '28/10/2026']);
  });
});
