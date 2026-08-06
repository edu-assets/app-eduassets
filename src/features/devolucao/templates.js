import { html, raw } from '../../core/utils/html.js';
import { getEquipamentoIcon } from '../../core/utils/equipamentoIcons.js';
import { gerarIniciais, formatarHora } from './utils.js';
import { renderEmptyState } from '../../shared/components/emptyState.js';
import { renderStatusBadge } from '../../shared/components/statusBadge.js';

const LIMITE_ICONES_CARD = 3;

export function renderDevolucaoEmptyState() {
    return renderEmptyState({
        containerClass: 'devolucao-vazia',
        imageSrc: 'public/assets/logos/eduAssets_logo-empty-state.webp',
        imageClass: 'devolucao-vazia-logo',
        titulo: 'Empréstimos aparecerão aqui',
        tituloClass: 'devolucao-vazia-texto',
        subtitulo: 'Registre um novo empréstimo para começar a acompanhar as devoluções.',
        subtituloClass: 'devolucao-vazia-sub'
    });
}

export function renderDevolucaoTabelaHeader() {
    return html`
        <div class="devolucao-tabela-header">
            <span>Responsável</span>
            <span>Equipamentos</span>
            <span>Empréstimo</span>
            <span>Ações</span>
        </div>
    `;
}

export function renderDevolucaoCard(loan) {
    const temObservacao = loan.observacao ? html`
        <span class="info-data-relativa">
            <span class="material-symbols-outlined" style="font-size: 14px; opacity: 0.7;">sticky_note_2</span>
            Com observação
        </span>
    ` : '';

    return html`
        <div class="devolucao-item" data-id="${loan.id}">
            <div class="devolucao-col-resp">
                <div class="devolucao-avatar">${gerarIniciais(loan.responsavel)}</div>
                <div class="devolucao-textos-resp">
                    <span class="info-resp-nome">${loan.responsavel}</span>
                    <span class="info-aluno-nome">${loan.aluno}</span>
                </div>
            </div>
            <div class="devolucao-col-equip">
                <div class="devolucao-itens-icons">${raw(renderItensIcons(loan.itens))}</div>
            </div>
            <div class="devolucao-col-data">
                <span class="info-data-completa">
                    <span class="material-symbols-outlined">schedule</span>
                    ${formatarHora(loan.createdAt)}
                </span>
                ${raw(temObservacao)}
            </div>
            <div class="devolucao-col-acao">
                <button class="btn btn-primary btn-sm devolver-btn" data-id="${loan.id}" data-requires-auth>Devolver</button>
            </div>
        </div>
    `;
}

export function renderItensIcons(itens) {
    if (itens.length <= LIMITE_ICONES_CARD) {
        return itens.map(renderItemIconPill).join('');
    }

    const visiveis = itens.slice(0, LIMITE_ICONES_CARD - 1);
    const restantes = itens.length - visiveis.length;

    return visiveis.map(renderItemIconPill).join('') +
        `<div class="devolucao-item-icon-pill devolucao-item-icon-mais" title="+${restantes} ${restantes > 1 ? 'itens' : 'item'}">...</div>`;
}

export function renderItemIconPill(item) {
    return html`
        <div class="devolucao-item-icon-pill" data-eq="${item.id}" title="${item.quantidade}x ${item.nome}">
            <span class="material-symbols-outlined">${getEquipamentoIcon(item.id)}</span>
            <span class="devolucao-item-icon-pill-texto">${item.quantidade}x ${item.nome}</span>
        </div>
    `;
}

export function renderDetalheItensView(itens) {
    return itens.map((item) => html`
        <li>
            <span class="material-symbols-outlined">${getEquipamentoIcon(item.id)}</span>
            <span class="detalhe-item-nome">${item.quantidade}x ${item.nome}</span>
            <span class="detalhe-item-status">Pendente</span>
        </li>
    `).join('');
}

export function renderDetalheItensEdit(itens) {
    return itens.map((item) => html`
        <li class="detalhe-emprestimo-item-edit">
            <input type="number" min="1" class="detalhe-item-qtd" value="${item.quantidade}" data-id="${item.id}">
            <span>${item.nome}</span>
            <button type="button" class="item-emprestimo-remover detalhe-item-remover" data-id="${item.id}" aria-label="Remover">
                <span class="material-symbols-outlined">close</span>
            </button>
        </li>
    `).join('');
}

export function renderDetalheObservacao(observacao) {
    if (!observacao) return '';
    return html`<span class="detalhe-emprestimo-obs-label">Observação</span><p>${observacao}</p>`;
}