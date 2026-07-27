import { html, raw } from '../../core/utils/html.js';
import { escapeHtml } from '../../core/utils/sanitize.js';
import { getEquipamentoIcon } from '../../core/utils/equipamentoIcons.js';
import { renderStatusBadge } from '../../shared/components/statusBadge.js';

const LIMITE_CHIPS_HISTORICO_PADRAO = 2;

export function renderDashboardCategoriaForm(dados) {
    return html`
        <p class="category-edit-subtitle">Resumo somente leitura da categoria.</p>

        <div class="form-group margin-bottom-lg">
            <label class="category-field-label">Nome da categoria</label>
            <div class="category-field-input">${dados.categoria}</div>
        </div>

        <div class="category-summary-box">
            <h4 class="category-summary-box-title">Resumo da categoria</h4>

            <div class="category-summary-grid">
                <div class="category-metric-col col-total">
                    <div class="metric-icon-wrap">
                        <span class="material-symbols-outlined">devices</span>
                    </div>
                    <div class="metric-readonly-value">${dados.total}</div>
                    <label>Total</label>
                </div>

                <div class="category-metric-col col-disponivel">
                    <div class="metric-icon-wrap">
                        <span class="material-symbols-outlined">check_circle</span>
                    </div>
                    <div class="metric-readonly-value">${dados.disponivel}</div>
                    <label>Disponíveis</label>
                </div>

                <div class="category-metric-col col-emprestado">
                    <div class="metric-icon-wrap">
                        <span class="material-symbols-outlined">schedule</span>
                    </div>
                    <div class="metric-readonly-value">${dados.emprestado}</div>
                    <label>Emprestados</label>
                </div>

                <div class="category-metric-col col-quebrado">
                    <div class="metric-icon-wrap">
                        <span class="material-symbols-outlined">warning</span>
                    </div>
                    <div class="metric-readonly-value">${dados.quebrado}</div>
                    <label>Quebrados</label>
                </div>
            </div>
        </div>
    `;
}

function renderDashboardEstoqueLinha(equipamento) {
    return html`
        <div class="estoque-row" data-id="${equipamento.id}" data-equipamento-id="${equipamento.id}">
            <span data-col="categoria">${equipamento.categoria?.nome ?? ''}</span>
            <span data-col="total" data-label="Total">${equipamento.quantidadeTotal}</span>
            <span data-col="disponivel" data-label="Disponível">${equipamento.quantidadeDisponivel}</span>
            <span data-col="quebrado" data-label="Quebrado">${equipamento.quantidadeQuebrada}</span>
        </div>
    `;
}

export function renderDashboardEstoqueContent(equipamentos) {
    const header = html`
        <div class="estoque-header">
            <span>Categoria</span>
            <span>Total</span>
            <span>Disponível</span>
            <span>Quebrado</span>
        </div>
    `;

    const linhas = equipamentos.length
        ? equipamentos.map(renderDashboardEstoqueLinha).join('')
        : html`<div class="dashboard-andamento-vazio" style="display:flex;"><p>Nenhum equipamento cadastrado.</p></div>`;

    return header + linhas;
}

export function renderDashboardAndamentoContent(loans) {
    if (!loans.length) return '';

    return loans.map((loan) => {
        const itensTexto = loan.itens.map((item) => `${item.quantidade}x ${escapeHtml(item.nome)}`).join(', ');
        return html`
            <div class="dashboard-andamento-item">
                <span class="dashboard-andamento-resp">${loan.responsavel}</span>
                <span class="dashboard-andamento-itens">${raw(itensTexto)}</span>
            </div>
        `;
    }).join('');
}

export function renderDashboardChip(item) {
    const titulo = `${item.quantidade}x ${escapeHtml(item.nome)}`;
    return html`
        <span class="historico-item-chip" title="${raw(titulo)}">
            <span class="material-symbols-outlined">${getEquipamentoIcon(item.id)}</span>${item.quantidade}
        </span>
    `;
}

export function renderDashboardChipsItens(itens, limiteChips = LIMITE_CHIPS_HISTORICO_PADRAO) {
    if (itens.length <= limiteChips) {
        return itens.map(renderDashboardChip).join('');
    }

    const visiveis = itens.slice(0, limiteChips);
    const restantes = itens.length - visiveis.length;

    return visiveis.map(renderDashboardChip).join('') +
        html`<span class="historico-item-chip historico-item-chip-mais">+${restantes}</span>`;
}

export function renderDashboardHistoricoContent(loans, limiteChips = LIMITE_CHIPS_HISTORICO_PADRAO) {
    if (!loans.length) return '';

    return loans.map((loan) => html`
        <div class="historico-row" data-id="${loan.id}">
            <span class="historico-numero" data-col="numero">#${loan.numero}</span>
            <span data-col="solicitante" data-label="Solicitante">${loan.aluno}</span>
            <span data-col="responsavel" data-label="Responsável">${loan.responsavel}</span>
            <span class="historico-data" data-col="retirada" data-label="Retirada">${loan.data}</span>
            <span class="historico-data" data-col="devolucao" data-label="Devolução">${loan.dataDevolucao || '—'}</span>
            <div class="historico-itens" data-col="itens" data-label="Itens">${raw(renderDashboardChipsItens(loan.itens, limiteChips))}</div>
            <span data-col="status" data-label="Status">${raw(renderStatusBadge(loan.status))}</span>
            <button type="button" class="btn btn-neutral btn-sm historico-detalhes-btn" data-id="${loan.id}">Detalhes</button>
        </div>
    `).join('');
}

export function renderDashboardHistoricoDetalheBody(loan) {
    const itensHtml = loan.itens.map((item) => html`
        <li>
            <span class="material-symbols-outlined">${getEquipamentoIcon(item.id)}</span>
            <span class="detalhe-item-nome">${item.quantidade}x ${item.nome}</span>
        </li>
    `).join('');

    const obsHtml = loan.observacao ? html`
        <div class="devolucao-detalhe-secao devolucao-detalhe-obs">
            <span class="detalhe-emprestimo-obs-label">Observação</span>
            <p>${loan.observacao}</p>
        </div>
    ` : '';

    return html`
        <div class="devolucao-detalhe-pessoa">
            <span class="devolucao-papel-icon devolucao-papel-icon-sm">
                <span class="material-symbols-outlined">badge</span>
            </span>
            <div class="devolucao-detalhe-pessoa-info">
                <div class="devolucao-detalhe-pessoa-linha">
                    <span class="info-resp">${loan.responsavel}</span>
                    <svg class="seta-svg" viewBox="0 0 40 12" xmlns="http://www.w3.org/2000/svg">
                        <line x1="0" y1="6" x2="32" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                        <polyline points="26,1 36,6 26,11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span class="info-value">${loan.aluno}</span>
                </div>
                <span class="devolucao-detalhe-pessoa-data">Retirada em ${loan.data}</span>
                <span class="devolucao-detalhe-pessoa-data">Devolução: ${loan.dataDevolucao || '—'}</span>
            </div>
        </div>

        <div class="devolucao-detalhe-secao">
            <div class="devolucao-detalhe-secao-header">
                <span>Itens emprestados</span>
                <span class="devolucao-detalhe-contagem">(${loan.itens.length})</span>
            </div>
            <ul class="detalhe-emprestimo-lista">${raw(itensHtml)}</ul>
        </div>

        ${raw(obsHtml)}

        ${raw(renderStatusBadge(loan.status))}
    `;
}