import { renderItemRow, renderItensEmptyState, renderOpcaoEquipamento, renderOpcaoResponsavel } from './templates.js';

export function renderItens(els, itens) {
    if (els.itensCount) els.itensCount.textContent = `(${itens.length})`;

    els.itensList.innerHTML = itens.length
        ? itens.map(renderItemRow).join('')
        : renderItensEmptyState();
}

export function renderModalItens(els, itens) {
    els.modalItensLista.innerHTML = itens.map(renderItemRow).join('');
}

export function popularSelectEquipamentos(select, equipamentos) {
    const placeholder = '<option value="" disabled selected hidden>Selecionar equipamento</option>';
    select.innerHTML = placeholder + equipamentos.map(renderOpcaoEquipamento).join('');
}

export function popularSelectResponsaveis(select, responsaveis) {
    const placeholder = '<option value="" disabled selected hidden>Responsável pelo empréstimo</option>';
    select.innerHTML = placeholder + responsaveis.map(renderOpcaoResponsavel).join('');
}