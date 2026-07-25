import { escapeHtml } from '../../core/utils/sanitize.js';
import { getEquipamentoIcon } from '../../core/utils/equipamentoIcons.js';

export function renderDashboardCategoriaForm(dados) {
    const total = Number(dados.total) || 0;
    const disponivel = Number(dados.disponivel) || 0;
    const quebrado = Number(dados.quebrado) || 0;
    const emprestado = Math.max(0, total - disponivel - quebrado);

    return `
        <p class="category-edit-subtitle">Atualize as informações da categoria.</p>

        <div class="form-group margin-bottom-lg">
            <label class="category-field-label">Nome da categoria <span class="required-asterisk">*</span></label>
            <!-- Ajuste: Lendo dados.categoria diretamente -->
            <input type="text" id="detalhe-estoque-categoria" class="category-field-input" value="${escapeHtml(dados.categoria)}" disabled>
        </div>

        <div class="category-summary-box">
            <h4 class="category-summary-box-title">Resumo da categoria</h4>

            <div class="category-summary-grid">
                <div class="category-metric-col col-total">
                    <div class="metric-icon-wrap">
                        <span class="material-symbols-outlined">devices</span>
                    </div>
                    <input type="number" id="detalhe-estoque-total" min="0" value="${total}">
                    <label for="detalhe-estoque-total">Total</label>
                </div>

                <div class="category-metric-col col-disponivel">
                    <div class="metric-icon-wrap">
                        <span class="material-symbols-outlined">check_circle</span>
                    </div>
                    <input type="number" id="detalhe-estoque-disponivel" min="0" value="${disponivel}">
                    <label for="detalhe-estoque-disponivel">Disponíveis</label>
                </div>

                <div class="category-metric-col col-emprestado">
                    <div class="metric-icon-wrap">
                        <span class="material-symbols-outlined">schedule</span>
                    </div>
                    <div class="metric-readonly-value">${emprestado}</div>
                    <label>Emprestados</label>
                </div>

                <div class="category-metric-col col-quebrado">
                    <div class="metric-icon-wrap">
                        <span class="material-symbols-outlined">warning</span>
                    </div>
                    <input type="number" id="detalhe-estoque-quebrado" min="0" value="${quebrado}">
                    <label for="detalhe-estoque-quebrado">Quebrados</label>
                </div>
            </div>
        </div>
    `;
}

export function renderDashboardEstoqueContent(equipamentos) {
    const rows = equipamentos.map((equipamento) => `
        <div class="estoque-row" data-id="${equipamento.id}" data-equipamento-id="${equipamento.id}" data-categoria="${escapeHtml(equipamento.categoria?.nome ?? '')}"
            data-total="${equipamento.quantidadeTotal}" data-disponivel="${equipamento.quantidadeDisponivel}" data-quebrado="${equipamento.quantidadeQuebrada}">
            <span data-col="categoria">${escapeHtml(equipamento.categoria?.nome ?? '')}</span>
            <span data-col="total" data-label="Total">${equipamento.quantidadeTotal}</span>
            <span data-col="disponivel" data-label="Disponível">${equipamento.quantidadeDisponivel}</span>
            <span data-col="quebrado" data-label="Quebrado">${equipamento.quantidadeQuebrada}</span>
            <span class="registros-row-menu-wrap">
                <button type="button" class="registros-row-menu-btn" aria-label="Mais opções">
                    <span class="material-symbols-outlined">more_vert</span>
                </button>
                <div class="registros-row-menu">
                    <span class="registros-row-menu-opcao" data-acao="editar">Editar</span>
                </div>
            </span>
        </div>
    `).join('');

    return `
        <div class="estoque-header">
            <span>Categoria</span>
            <span>Total</span>
            <span>Disponível</span>
            <span>Quebrado</span>
            <span></span>
        </div>
        ${rows || '<div class="dashboard-andamento-vazio" style="display:flex;"><p>Nenhum equipamento cadastrado.</p></div>'}
    `;
}

export function renderDashboardAndamentoContent(loans) {
    if (!loans.length) {
        return '';
    }

    return loans.map((loan) => `
        <div class="dashboard-andamento-item">
            <span class="dashboard-andamento-resp">${escapeHtml(loan.responsavel)}</span>
            <span class="dashboard-andamento-itens">${loan.itens.map((item) => `${item.quantidade}x ${escapeHtml(item.nome)}`).join(', ')}</span>
        </div>
    `).join('');
}

export function renderDashboardHistoricoContent(loans, limiteChips = 2) {
    if (!loans.length) {
        return '';
    }

    return loans.map((loan) => `
        <div class="historico-row" data-id="${loan.id}">
            <span class="historico-numero" data-col="numero">#${loan.numero}</span>
            <span data-col="solicitante" data-label="Solicitante">${escapeHtml(loan.aluno)}</span>
            <span data-col="responsavel" data-label="Responsável">${escapeHtml(loan.responsavel)}</span>
            <span class="historico-data" data-col="retirada" data-label="Retirada">${loan.data}</span>
            <span class="historico-data" data-col="devolucao" data-label="Devolução">${loan.dataDevolucao || '—'}</span>
            <div class="historico-itens" data-col="itens" data-label="Itens">${renderDashboardChipsItens(loan.itens, limiteChips)}</div>
            <span class="historico-status-badge historico-status-${loan.status}" data-col="status" data-label="Status">
                ${loan.status === 'aberto' ? 'Aberto' : 'Devolvido'}
            </span>
            <button type="button" class="btn btn-neutral btn-sm historico-detalhes-btn" data-id="${loan.id}">Detalhes</button>
        </div>
    `).join('');
}

export function renderDashboardHistoricoDetalheBody(loan) {
    const itensHtml = loan.itens.map((item) => `
        <li>
            <span class="material-symbols-outlined">${getEquipamentoIcon(item.id)}</span>
            <span class="detalhe-item-nome">${item.quantidade}x ${escapeHtml(item.nome)}</span>
        </li>
    `).join('');

    const obsHtml = loan.observacao ? `
        <div class="devolucao-detalhe-secao devolucao-detalhe-obs">
            <span class="detalhe-emprestimo-obs-label">Observação</span>
            <p>${escapeHtml(loan.observacao)}</p>
        </div>
    ` : '';

    return `
        <div class="devolucao-detalhe-pessoa">
            <span class="devolucao-papel-icon devolucao-papel-icon-sm">
                <span class="material-symbols-outlined">badge</span>
            </span>
            <div class="devolucao-detalhe-pessoa-info">
                <div class="devolucao-detalhe-pessoa-linha">
                    <span class="info-resp">${escapeHtml(loan.responsavel)}</span>
                    <svg class="seta-svg" viewBox="0 0 40 12" xmlns="http://www.w3.org/2000/svg">
                        <line x1="0" y1="6" x2="32" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                        <polyline points="26,1 36,6 26,11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span class="info-value">${escapeHtml(loan.aluno)}</span>
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
            <ul class="detalhe-emprestimo-lista">${itensHtml}</ul>
        </div>

        ${obsHtml}

        <span class="historico-status-badge historico-status-${loan.status}">
            ${loan.status === 'aberto' ? 'Aberto' : 'Devolvido'}
        </span>
    `;
}

export function renderDashboardChipsItens(itens, limiteChips = 2) {
    if (itens.length <= limiteChips) {
        return itens.map(renderDashboardChip).join('');
    }

    const visiveis = itens.slice(0, limiteChips);
    const restantes = itens.length - visiveis.length;

    return visiveis.map(renderDashboardChip).join('') +
        `<span class="historico-item-chip historico-item-chip-mais">+${restantes}</span>`;
}

export function renderDashboardChip(item) {
    return `
        <span class="historico-item-chip" title="${item.quantidade}x ${escapeHtml(item.nome)}">
            <span class="material-symbols-outlined">${getEquipamentoIcon(item.id)}</span>${item.quantidade}
        </span>
    `;
}