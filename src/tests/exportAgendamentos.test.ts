import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loans: [] as unknown[],
  gerarLinhasCsv: vi.fn((_m: Array<Array<string | number>>) => '')
}));

vi.mock('../core/ui/index.js', () => ({ showToast: vi.fn() }));
vi.mock('../core/state/i18nStore.js', () => ({ t: (k: string) => k, formatarDataHora: (v: unknown) => (typeof v === 'string' ? v : ''), getLocale: () => 'pt-BR' }));
vi.mock('../core/state/authStore.js', () => ({ isAutenticado: () => false }));
vi.mock('../core/state/equipamentoStore.js', () => ({ getEquipamentos: () => [] }));
vi.mock('../core/api/emprestimos.js', () => ({ listarTodasPaginasEmprestimos: async () => ({ items: mocks.loans, completo: true }) }));
vi.mock('../core/state/ocorrenciasStore.js', () => ({ getOcorrenciasPorTipo: () => [] }));
vi.mock('../core/services/csv.js', () => ({ gerarLinhasCsv: mocks.gerarLinhasCsv, baixarArquivoCsv: vi.fn() }));
vi.mock('../core/services/excel.js', () => ({ gerarArquivoXlsx: vi.fn(), baixarArquivoXlsx: vi.fn() }));
vi.mock('../core/services/pdf.js', () => ({ gerarBaixarPdf: vi.fn() }));

import { exportarDados } from '../features/exportar/service.js';

const base = { dataInicial: '', dataFinal: '', formato: 'csv', equipamentoIds: [] as string[], observacao: '', tipoDados: 'devolucoes' as const };
const api = (id: number, status: string, extra: Record<string, unknown> = {}) => ({
  id, solicitanteNome: `Aluno ${id}`, responsavelId: 3, responsavel: { id: 3, nome: 'Ana' }, status,
  dataRetirada: '2026-11-25T13:50:00.000Z', dataDevolucao: null, observacao: null, createdAt: '2026-11-25T13:50:00.000Z', itens: [], ...extra
});

describe('exportação com agendamentos', () => {
  beforeEach(() => mocks.gerarLinhasCsv.mockClear());

  it('mantém as colunas originais e acrescenta "Agendado para" e "Devolução prevista"', async () => {
    mocks.loans = [api(1, 'ABERTO')];
    await exportarDados(base);
    const m = mocks.gerarLinhasCsv.mock.calls[0][0];
    expect(m[0]).toEqual(['Numero', 'Solicitante', 'Responsavel', 'Retirada', 'Devolucao', 'Status', 'exportar.coluna_agendado_para', 'exportar.coluna_devolucao_prevista']);
  });

  it('status traduzido (nunca o valor interno) e datas de agendamento preenchidas', async () => {
    mocks.loans = [
      api(1, 'AGENDADO', { dataAgendada: '2026-11-26T09:00:00.000Z', dataRetirada: '2026-11-26T09:00:00.000Z', dataPrevistaDevolucao: '2026-11-26T10:00:00.000Z' }),
      api(2, 'ABERTO', { dataAgendada: '2026-11-25T13:30:00.000Z', dataPrevistaDevolucao: '2026-11-25T15:00:00.000Z' }),
      api(3, 'DEVOLVIDO')
    ];
    await exportarDados(base);
    const [, agendado, retirado, devolvido] = mocks.gerarLinhasCsv.mock.calls[0][0];
    expect(agendado.slice(5)).toEqual(['shared.statusBadge.agendado', '2026-11-26T09:00:00.000Z', '2026-11-26T10:00:00.000Z']);
    expect(retirado[5]).toBe('shared.statusBadge.aberto');
    expect(retirado[6]).toBe('2026-11-25T13:30:00.000Z');
    expect(devolvido.slice(5)).toEqual(['shared.statusBadge.devolvido', '', '']);
    expect(JSON.stringify(mocks.gerarLinhasCsv.mock.calls[0][0])).not.toMatch(/"(agendado|aberto|devolvido)"/);
  });
});
