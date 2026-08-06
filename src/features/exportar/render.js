import { renderEquipamentoChecklistItem } from './templates.js';

const FORMATOS_LABEL = { csv: 'CSV (.csv)', excel: 'Excel (.xlsx)', pdf: 'PDF (.pdf)' };
const TIPO_LABEL = { devolucoes: 'Empréstimos e devoluções', equipamentos: 'Equipamentos' };

export function definirPeriodoPadrao(els) {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    els.dataInicialInput.value = paraInputDate(inicioMes);
    els.dataFinalInput.value = paraInputDate(fimMes);
}

function paraInputDate(date) {
    return date.toISOString().slice(0, 10);
}

export function definirEstadoCarregando(els, carregando) {
    els.btnSubmit.disabled = carregando;
    els.btnSubmit.innerHTML = carregando ? 'Gerando arquivo...' : els.textoOriginalBtn;
}

export function popularChecklistEquipamentos(els, equipamentos) {
    els.equipListaContainer.innerHTML = equipamentos.map(renderEquipamentoChecklistItem).join('');
    atualizarContagemEquipamentos(els);
}

export function selecionarTipo(els, tipo) {
    els.tipoDadosInput.value = tipo;
    els.tipoCards.forEach((card) => card.classList.toggle('active', card.dataset.tipo === tipo));

    const ehEquipamentos = tipo === 'equipamentos';

    els.dataInicialInput.disabled = ehEquipamentos;
    els.dataFinalInput.disabled = ehEquipamentos;
    els.periodoWrap.classList.toggle('exportar-periodo-disabled', ehEquipamentos);
    els.periodoDesc.textContent = ehEquipamentos
        ? 'Exportação representa o estado atual do inventário. Clique para filtrar por período de cadastro.'
        : 'Mês atual selecionado por padrão. Ajuste se necessário.';

    els.equipWrap.style.display = ehEquipamentos ? 'flex' : 'none';

    atualizarResumo(els);
}

export function selecionarFormato(els, formato) {
    els.formatoInput.value = formato;
    els.formatoBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.formato === formato));
    atualizarResumo(els);
}

export function habilitarPeriodo(els) {
    els.dataInicialInput.disabled = false;
    els.dataFinalInput.disabled = false;
    els.periodoWrap.classList.remove('exportar-periodo-disabled');
}

export function atualizarContagemEquipamentos(els) {
    const checkboxes = els.equipListaContainer.querySelectorAll('.exportar-equip-checkbox');
    const marcados = els.equipListaContainer.querySelectorAll('.exportar-equip-checkbox:checked');

    els.equipContagem.textContent = `${marcados.length} de ${checkboxes.length} selecionados`;
    els.equipTodosCheckbox.checked = checkboxes.length > 0 && marcados.length === checkboxes.length;
    els.equipTodosCheckbox.indeterminate = marcados.length > 0 && marcados.length < checkboxes.length;

    atualizarResumo(els);
}

export function atualizarResumo(els) {
    const tipo = els.tipoDadosInput.value;
    const formato = els.formatoInput.value;

    els.resumoFormato.textContent = FORMATOS_LABEL[formato] || '—';

    if (tipo === 'equipamentos') {
        const total = els.equipListaContainer.querySelectorAll('.exportar-equip-checkbox').length;
        const marcados = els.equipListaContainer.querySelectorAll('.exportar-equip-checkbox:checked').length;
        els.resumoTipo.textContent = `${TIPO_LABEL[tipo]} (${marcados}/${total})`;
        els.resumoPeriodo.textContent = els.dataInicialInput.disabled
            ? 'Estado atual do sistema'
            : `${formatarDataBR(els.dataInicialInput.value)} a ${formatarDataBR(els.dataFinalInput.value)}`;
        return;
    }

    els.resumoTipo.textContent = TIPO_LABEL[tipo] || '—';
    const inicio = els.dataInicialInput.value ? formatarDataBR(els.dataInicialInput.value) : '—';
    const fim = els.dataFinalInput.value ? formatarDataBR(els.dataFinalInput.value) : '—';
    els.resumoPeriodo.textContent = `${inicio} a ${fim}`;
}

function formatarDataBR(isoDate) {
    if (!isoDate) return '—';
    const [ano, mes, dia] = isoDate.split('-');
    return `${dia}/${mes}/${ano}`;
}