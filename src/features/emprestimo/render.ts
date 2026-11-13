import { renderItemRow, renderItensEmptyState } from './templates.js';
import { renderOpcoesSelect } from '../../shared/components/selectOptions.js';
import { calcularDisponivelEfetivo } from '../../core/utils/estoque.js';
import { t } from '../../core/state/i18nStore.js';
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

/** Unidades ainda disponíveis para este empréstimo (desconta o que já foi adicionado à lista). */
export function disponivelRestante(equipamento: Equipamento | undefined, itens: LoanItemUI[]): number {
    if (!equipamento) return 0;
    const jaAdicionado = itens.find((item) => String(item.id) === String(equipamento.id))?.quantidade ?? 0;
    return Math.max(0, calcularDisponivelEfetivo(equipamento) - jaAdicionado);
}

export function popularSelectEquipamentos(
    select: HTMLSelectElement,
    equipamentos: Equipamento[],
    itens: LoanItemUI[] = []
): void {
    const opcoes = equipamentos.map((eq) => {
        const restante = disponivelRestante(eq, itens);
        const sufixo = t(restante === 1 ? 'emprestimo.disponivel_singular' : 'emprestimo.disponivel_plural').replace('{n}', String(restante));
        return {
            id: eq.id,
            label: `${eq.modelo} — ${eq.categoria?.nome ?? ''} (${sufixo})`,
            disabled: restante <= 0
        };
    });
    fillSelect(select, renderPlaceholderOption('Selecionar equipamento'), renderOpcoesSelect(opcoes));
}

export function popularSelectResponsaveis(select: HTMLSelectElement, responsaveis: Responsavel[]): void {
    const opcoes = responsaveis.map((r) => ({ id: r.id, label: r.nome }));
    fillSelect(select, renderPlaceholderOption(t('emprestimo.responsavel_pelo_emprestimo')), renderOpcoesSelect(opcoes));
}
