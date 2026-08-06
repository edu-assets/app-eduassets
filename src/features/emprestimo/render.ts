import { renderItemRow, renderItensEmptyState, renderOpcaoEquipamento, renderOpcaoResponsavel } from './templates.js';
import type { LoanItemUI, Equipamento, Responsavel } from '../../types/index.js';

interface RenderItensEls {
    itensList: HTMLElement;
    itensCount: HTMLElement | null;
}

interface RenderModalEls {
    modalItensLista: HTMLElement;
}

export function renderItens(els: RenderItensEls, itens: LoanItemUI[]): void {
    if (els.itensCount) els.itensCount.textContent = `(${itens.length})`;

    els.itensList.innerHTML = itens.length
        ? itens.map(renderItemRow).join('')
        : renderItensEmptyState();
}

export function renderModalItens(els: RenderModalEls, itens: LoanItemUI[]): void {
    els.modalItensLista.innerHTML = itens.map(renderItemRow).join('');
}

export function popularSelectEquipamentos(select: HTMLSelectElement, equipamentos: Equipamento[]): void {
    const placeholder = '<option value="" disabled selected hidden>Selecionar equipamento</option>';
    select.innerHTML = placeholder + equipamentos.map(renderOpcaoEquipamento).join('');
}

export function popularSelectResponsaveis(select: HTMLSelectElement, responsaveis: Responsavel[]): void {
    const placeholder = '<option value="" disabled selected hidden>Responsável pelo empréstimo</option>';
    select.innerHTML = placeholder + responsaveis.map(renderOpcaoResponsavel).join('');
}