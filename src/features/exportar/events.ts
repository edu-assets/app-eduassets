import { showToast } from '../../core/ui/index.js';
import { exportarDados } from './service.js';
import {
    definirEstadoCarregando,
    selecionarTipo,
    selecionarFormato,
    habilitarPeriodo,
    atualizarResumo,
    atualizarContagemEquipamentos
} from './render.js';
import type { ExportarEls } from './render.js';
import type { FiltrosExportacao } from '../../types/index.js';

export function attachExportarEvents(els: ExportarEls): void {
    els.tipoCards.forEach((card) => {
        card.addEventListener('click', () => selecionarTipo(els, card.dataset.tipo ?? ''));
    });

    els.formatoBtns.forEach((btn) => {
        btn.addEventListener('click', () => selecionarFormato(els, btn.dataset.formato ?? ''));
    });

    if (els.periodoWrap) {
        els.periodoWrap.addEventListener('click', () => {
            if (els.periodoWrap.classList.contains('exportar-periodo-disabled')) {
                habilitarPeriodo(els);
            }
        });
    }

    els.dataInicialInput.addEventListener('change', () => atualizarResumo(els));
    els.dataFinalInput.addEventListener('change', () => atualizarResumo(els));

    els.equipTodosCheckbox.addEventListener('change', () => {
        const marcar = els.equipTodosCheckbox.checked;
        els.equipListaContainer.querySelectorAll<HTMLInputElement>('.exportar-equip-checkbox').forEach((cb) => {
            cb.checked = marcar;
        });
        atualizarContagemEquipamentos(els);
    });

    els.equipListaContainer.addEventListener('change', (e) => {
        const target = e.target as HTMLElement;
        if (!target.classList.contains('exportar-equip-checkbox')) return;
        atualizarContagemEquipamentos(els);
    });

    els.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const equipamentoIds = els.tipoDadosInput.value === 'equipamentos'
            ? Array.from(els.equipListaContainer.querySelectorAll<HTMLInputElement>('.exportar-equip-checkbox:checked')).map((cb) => cb.value)
            : [];

        if (els.tipoDadosInput.value === 'equipamentos' && !equipamentoIds.length) {
            showToast('Selecione ao menos um equipamento para exportar.', 'warning');
            return;
        }

        const filtros: FiltrosExportacao = {
            tipoDados: els.tipoDadosInput.value,
            dataInicial: els.dataInicialInput.disabled ? '' : els.dataInicialInput.value,
            dataFinal: els.dataFinalInput.disabled ? '' : els.dataFinalInput.value,
            formato: els.formatoInput.value,
            equipamentoIds,
            observacao: els.observacaoInput?.value.trim() ?? ''
        };

        definirEstadoCarregando(els, true);

       try {
            await exportarDados(filtros);
            showToast('Exportação gerada com sucesso', 'success');
        } catch (erro) {
            showToast(erro instanceof Error ? erro.message : 'Erro ao exportar dados.', 'error');
        } finally {
            definirEstadoCarregando(els, false);
        }
    });
}