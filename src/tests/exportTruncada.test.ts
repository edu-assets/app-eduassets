import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ completo: false, showToast: vi.fn() }));
vi.mock('../core/api/emprestimos.js', () => ({
    listarTodasPaginasEmprestimos: async () => ({ items: [], completo: mocks.completo })
}));
vi.mock('../core/state/equipamentoStore.js', () => ({ getEquipamentos: () => [] }));
vi.mock('../core/state/ocorrenciasStore.js', () => ({ getOcorrenciasPorTipo: () => [] }));
vi.mock('../core/state/authStore.js', () => ({ isAutenticado: () => true }));
vi.mock('../core/state/i18nStore.js', () => ({ t: (k: string) => k }));
vi.mock('../core/ui/index.js', () => ({ showToast: mocks.showToast }));
vi.mock('../core/services/csv.js', () => ({ gerarLinhasCsv: vi.fn(), baixarArquivoCsv: vi.fn() }));
vi.mock('../core/services/excel.js', () => ({ gerarArquivoXlsx: vi.fn(), baixarArquivoXlsx: vi.fn() }));
vi.mock('../core/services/pdf.js', () => ({ gerarBaixarPdf: vi.fn() }));

import { prepararDadosEmprestimos } from '../features/exportar/service.js';

describe('exportação truncada', () => {
    it('avisa com toast quando o limite de páginas corta os dados', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        await prepararDadosEmprestimos();
        expect(mocks.showToast).toHaveBeenCalledWith('feedback.exportacao_truncada', 'warning');
    });

    it('não avisa quando completo', async () => {
        mocks.showToast.mockClear();
        mocks.completo = true;
        await prepararDadosEmprestimos();
        expect(mocks.showToast).not.toHaveBeenCalled();
    });
});
