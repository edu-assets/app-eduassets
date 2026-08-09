import { renderItemRow, renderItensEmptyState } from './templates.js';
import { renderOpcoesSelect } from '../../shared/components/selectOptions.js';
import { fillSelect, renderPlaceholderOption } from '../../shared/dom/fillSelect.js';
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
    const opcoes = equipamentos.map((eq) => ({ id: eq.id, label: `${eq.modelo} — ${eq.categoria?.nome ?? ''}` }));
    fillSelect(select, renderPlaceholderOption('Selecionar equipamento'), renderOpcoesSelect(opcoes));
}

export function popularSelectResponsaveis(select: HTMLSelectElement, responsaveis: Responsavel[]): void {
    const opcoes = responsaveis.map((r) => ({ id: r.id, label: r.nome }));
    fillSelect(select, renderPlaceholderOption('Responsável pelo empréstimo'), renderOpcoesSelect(opcoes));
}