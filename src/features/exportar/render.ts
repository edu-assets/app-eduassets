import { renderEquipamentoChecklistItem } from './templates.js';
import type { Equipamento } from '../../types/index.js';
import { t } from '../../core/state/i18nStore.js';

const FORMATOS_LABEL: Record<string, string> = { csv: 'CSV (.csv)', excel: 'Excel (.xlsx)', pdf: 'PDF (.pdf)' };
function tipoLabel(tipo: string): string {
    return tipo === 'devolucoes' ? t('exportar.emprestimos_e_devolucoes') : t('exportar.equipamentos');
}

export interface ExportarEls {
    form: HTMLFormElement;
    tipoDadosInput: HTMLInputElement;
    tipoCards: NodeListOf<HTMLElement>;
    periodoWrap: HTMLElement;
    periodoDesc: HTMLElement;
    dataInicialInput: HTMLInputElement;
    dataFinalInput: HTMLInputElement;
    formatoInput: HTMLInputElement;
    formatoBtns: NodeListOf<HTMLElement>;
    observacaoInput: HTMLTextAreaElement | null;
    equipWrap: HTMLElement;
    equipTodosCheckbox: HTMLInputElement;
    equipContagem: HTMLElement;
    equipListaContainer: HTMLElement;
    resumoTipo: HTMLElement;
    resumoPeriodo: HTMLElement;
    resumoFormato: HTMLElement;
    btnSubmit: HTMLButtonElement;
    textoOriginalBtn: string;
}

export function definirPeriodoPadrao(els: ExportarEls): void {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    els.dataInicialInput.value = paraInputDate(inicioMes);
    els.dataFinalInput.value = paraInputDate(fimMes);
}

function paraInputDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function definirEstadoCarregando(els: ExportarEls, carregando: boolean): void {
    els.btnSubmit.disabled = carregando;
    els.btnSubmit.innerHTML = carregando ? t('exportar.gerando_arquivo') : els.textoOriginalBtn;
}

export function popularChecklistEquipamentos(els: ExportarEls, equipamentos: Equipamento[]): void {
    els.equipListaContainer.innerHTML = equipamentos.map(renderEquipamentoChecklistItem).join('');
    atualizarContagemEquipamentos(els);
}

export function selecionarTipo(els: ExportarEls, tipo: string): void {
    els.tipoDadosInput.value = tipo;
    els.tipoCards.forEach((card) => card.classList.toggle('active', card.dataset.tipo === tipo));

    const ehEquipamentos = tipo === 'equipamentos';

    els.dataInicialInput.disabled = ehEquipamentos;
    els.dataFinalInput.disabled = ehEquipamentos;
    els.periodoWrap.classList.toggle('exportar-periodo-disabled', ehEquipamentos);
    els.periodoDesc.textContent = ehEquipamentos
        ? t('exportar.estado_atual_do_inventario')
        : t('shell.mes_atual_selecionado_por_padrao_ajuste_');

    els.equipWrap.style.display = ehEquipamentos ? 'flex' : 'none';

    atualizarResumo(els);
}

export function selecionarFormato(els: ExportarEls, formato: string): void {
    els.formatoInput.value = formato;
    els.formatoBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.formato === formato));
    atualizarResumo(els);
}

export function habilitarPeriodo(els: ExportarEls): void {
    els.dataInicialInput.disabled = false;
    els.dataFinalInput.disabled = false;
    els.periodoWrap.classList.remove('exportar-periodo-disabled');
}

export function atualizarContagemEquipamentos(els: ExportarEls): void {
    const checkboxes = els.equipListaContainer.querySelectorAll<HTMLInputElement>('.exportar-equip-checkbox');
    const marcados = els.equipListaContainer.querySelectorAll<HTMLInputElement>('.exportar-equip-checkbox:checked');

    els.equipContagem.textContent = t('exportar.selecionados_de_total')
        .replace('{selecionados}', String(marcados.length))
        .replace('{total}', String(checkboxes.length));
    els.equipTodosCheckbox.checked = checkboxes.length > 0 && marcados.length === checkboxes.length;
    els.equipTodosCheckbox.indeterminate = marcados.length > 0 && marcados.length < checkboxes.length;

    atualizarResumo(els);
}

export function atualizarResumo(els: ExportarEls): void {
    const tipo = els.tipoDadosInput.value;
    const formato = els.formatoInput.value;

    els.resumoFormato.textContent = FORMATOS_LABEL[formato] || '—';

    if (tipo === 'equipamentos') {
        const total = els.equipListaContainer.querySelectorAll('.exportar-equip-checkbox').length;
        const marcados = els.equipListaContainer.querySelectorAll('.exportar-equip-checkbox:checked').length;
        els.resumoTipo.textContent = `${tipoLabel(tipo)} (${marcados}/${total})`;
        els.resumoPeriodo.textContent = els.dataInicialInput.disabled
            ? t('exportar.estado_atual_do_sistema')
            : `${formatarDataBR(els.dataInicialInput.value)} a ${formatarDataBR(els.dataFinalInput.value)}`;
        return;
    }

    els.resumoTipo.textContent = tipoLabel(tipo) || '—';
    const inicio = els.dataInicialInput.value ? formatarDataBR(els.dataInicialInput.value) : '—';
    const fim = els.dataFinalInput.value ? formatarDataBR(els.dataFinalInput.value) : '—';
    els.resumoPeriodo.textContent = `${inicio} a ${fim}`;
}

function formatarDataBR(isoDate: string): string {
    if (!isoDate) return '—';
    const [ano, mes, dia] = isoDate.split('-');
    return `${dia}/${mes}/${ano}`;
}
