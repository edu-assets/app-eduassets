import { html } from '../../core/utils/html.js';
import { renderEmptyState } from '../../shared/components/emptyState.js';

export function renderItemRow(item) {
    return html`
        <div class="item-emprestimo-row">
            <div class="item-emprestimo-info">
                <span class="item-emprestimo-qtd">${item.quantidade}x</span>
                <span>${item.nome}</span>
            </div>
            <button type="button" class="item-emprestimo-remover" data-id="${item.id}" aria-label="Remover">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
    `;
}

export function renderItensEmptyState() {
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

export function renderOpcaoEquipamento(equipamento) {
    return html`<option value="${equipamento.id}">${equipamento.modelo} — ${equipamento.categoria?.nome ?? ''}</option>`;
}

export function renderOpcaoResponsavel(responsavel) {
    return html`<option value="${responsavel.id}">${responsavel.nome}</option>`;
}