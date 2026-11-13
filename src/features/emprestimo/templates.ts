import { html } from '../../core/utils/html.js';
import { t } from '../../core/state/i18nStore.js';
import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { getEquipamentoIcon } from '../../core/utils/equipamentoIcons.js';
import { renderEmptyState } from '../../shared/components/emptyState.js';
import type { LoanItemUI } from '../../types/index.js';
import type { Equipamento, Responsavel } from '../../types/index.js';


export function renderItemRow(item: LoanItemUI): string {
    const icone = getEquipamentoIcon(item.id);
    const categoria = getEquipamentos().find((eq) => String(eq.id) === String(item.id))?.categoria?.nome;
    const rotulo = `${item.quantidade}x ${item.nome}${categoria ? ` — ${categoria}` : ''}`;
    return html`
        <div class="item-emprestimo-row" title="${rotulo}">
            <span class="material-symbols-outlined item-emprestimo-icone" aria-hidden="true">${icone}</span>
            <span class="item-emprestimo-qtd">${item.quantidade}x</span>
            <span class="item-emprestimo-nome">${item.nome}</span>
            <button type="button" class="item-emprestimo-remover" data-id="${item.id}" aria-label="${t('devolucao.remover')}: ${rotulo}" title="${t('devolucao.remover')}">
                <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
        </div>
    `;
}

export function renderItensEmptyState(): string {
    return renderEmptyState({
        containerClass: 'itens-emprestimo-empty',
        icon: 'inventory_2',
        titulo: 'Nenhum item adicionado ainda.',
        tituloTag: 'span',
        tituloClass: 'itens-emprestimo-empty-titulo',
        subtitulo: 'Adicione equipamentos acima para criar a lista.',
        subtituloTag: 'span',
        subtituloClass: 'itens-emprestimo-empty-sub'
    });
}

export function renderOpcaoEquipamento(equipamento: Equipamento): string {
    return html`<option value="${equipamento.id}">${equipamento.modelo} — ${equipamento.categoria?.nome ?? ''}</option>`;
}

export function renderOpcaoResponsavel(responsavel: Responsavel): string {
    return html`<option value="${responsavel.id}">${responsavel.nome}</option>`;
}