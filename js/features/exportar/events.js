import { showToast } from '../../core/ui/index.js';
import { exportarDados } from './service.js';
import { definirEstadoCarregando } from './render.js';

export function attachExportarEvents(els) {
    els.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!els.form.checkValidity()) {
            els.form.reportValidity();
            return;
        }

        const equipamentoIds = Array.from(els.equipamentosSelect?.selectedOptions ?? []).map((opt) => opt.value);

        const filtros = {
            tipoDados: els.tipoDadosSelect.value,
            dataInicial: els.dataInicialInput.value,
            dataFinal: els.dataFinalInput.value,
            formato: els.formatoSelect.value,
            equipamentoIds,
            observacao: els.observacaoInput?.value.trim() ?? ''
        };

        definirEstadoCarregando(els, true);

        try {
            exportarDados(filtros);
            showToast('Exportação gerada com sucesso', 'success');
        } catch (erro) {
            showToast(erro instanceof Error ? erro.message : 'Erro ao exportar dados.', 'error');
        } finally {
            definirEstadoCarregando(els, false);
        }
    });
}