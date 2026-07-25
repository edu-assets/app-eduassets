import { html } from '../../core/utils/html.js';

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
    return html`
        <div class="itens-emprestimo-empty">
            <span class="material-symbols-outlined">inventory_2</span>
            <span class="itens-emprestimo-empty-titulo">Nenhum item adicionado ainda.</span>
            <span class="itens-emprestimo-empty-sub">Adicione equipamentos acima para criar a lista.</span>
        </div>
    `;
}

export function renderOpcaoEquipamento(equipamento) {
    return html`<option value="${equipamento.id}">${equipamento.modelo} — ${equipamento.categoria?.nome ?? ''}</option>`;
}

export function renderOpcaoResponsavel(responsavel) {
    return html`<option value="${responsavel.id}">${responsavel.nome}</option>`;
}