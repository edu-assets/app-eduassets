import { html, raw } from '../../core/utils/html.js';
import { escapeHtml } from '../../core/utils/sanitize.js';
import { getEquipamentoIcon } from '../../core/utils/equipamentoIcons.js';
import { renderStatusBadge } from '../../shared/components/statusBadge.js';
import { renderPessoaProtegida } from '../../shared/components/restrictedPerson.js';
import { t, formatarDataHora } from '../../core/state/i18nStore.js';
import { renderAutoriaEmprestimo, envolverAutoria } from '../../shared/components/autoria.js';
import { renderEmptyStateSemResultados } from '../../shared/components/emptyState.js';
import type { Equipamento, LoanUI, LoanItemUI, CategoriaResumoDados } from '../../types/index.js';

const LIMITE_CHIPS_HISTORICO_PADRAO = 2;

export function renderDashboardCategoriaForm(dados: CategoriaResumoDados): string {
    return html`
        <p class="category-edit-subtitle">${t('dashboard.resumo_somente_leitura_da_categoria')}</p>

        <div class="form-group margin-bottom-lg">
            <label class="category-field-label">${t('dashboard.equipamento')}</label>
            <div class="category-field-input">${dados.modelo}</div>
        </div>

        <div class="form-group margin-bottom-lg">
            <label class="category-field-label">${t('dashboard.nome_da_categoria')}</label>
            <div class="category-field-input">${dados.categoria}</div>
        </div>

        <div class="category-summary-box">
            <h4 class="category-summary-box-title">${t('dashboard.resumo_da_categoria')}</h4>

            <div class="category-summary-grid">
                <div class="category-metric-col col-total">
                    <div class="metric-icon-wrap"><span class="material-symbols-outlined">devices</span></div>
                    <div class="metric-readonly-value">${dados.total}</div>
                    <label>${t('dashboard.total')}</label>
                </div>

                <div class="category-metric-col col-disponivel">
                    <div class="metric-icon-wrap"><span class="material-symbols-outlined">check_circle</span></div>
                    <div class="metric-readonly-value">${dados.disponivel}</div>
                    <label>${t('dashboard.disponiveis')}</label>
                </div>

                <div class="category-metric-col col-emprestado">
                    <div class="metric-icon-wrap"><span class="material-symbols-outlined">schedule</span></div>
                    <div class="metric-readonly-value">${dados.emprestado}</div>
                    <label>${t('dashboard.emprestados')}</label>
                </div>

                <div class="category-metric-col col-manutencao">
                    <div class="metric-icon-wrap"><span class="material-symbols-outlined">build</span></div>
                    <div class="metric-readonly-value">${dados.manutencao}</div>
                    <label>${t('dashboard.manutencao')}</label>
                </div>

                <div class="category-metric-col col-quebrado">
                    <div class="metric-icon-wrap"><span class="material-symbols-outlined">warning</span></div>
                    <div class="metric-readonly-value">${dados.quebrado}</div>
                    <label>${t('dashboard.quebrados')}</label>
                </div>
            </div>
        </div>
    `;
}

/** Status de estoque exibido na linha: 'esgotado' (disponível 0), 'estoque-baixo' (≤10% do total) ou null. */
export function statusEstoqueEquipamento(equipamento: Equipamento): 'esgotado' | 'estoque-baixo' | null {
    const total = equipamento.quantidadeTotal;
    const disponivel = equipamento.quantidadeDisponivel;
    if (!(total > 0)) return null;
    if (disponivel === 0) return 'esgotado';
    if (disponivel > 0 && disponivel <= Math.max(1, Math.floor(total * 0.1))) return 'estoque-baixo';
    return null;
}

function renderDashboardEstoqueLinha(equipamento: Equipamento): string {
    const status = statusEstoqueEquipamento(equipamento);
    const badge = status ? renderStatusBadge(status) : '';
    return html`
        <div class="estoque-row" data-id="${equipamento.id}" data-equipamento-id="${equipamento.id}"
            role="button" tabindex="0">
            <span data-col="categoria">
                <span class="estoque-modelo">${equipamento.modelo}</span>
                <span class="estoque-categoria">${equipamento.categoria?.nome ?? ''}</span>
            </span>
            <span data-col="total" data-label="${t('dashboard.total')}">${equipamento.quantidadeTotal}</span>
            <span data-col="disponivel" data-label="${t('dashboard.disponivel')}">${equipamento.quantidadeDisponivel}${raw(badge)}</span>
            <span data-col="quebrado" data-label="${t('dashboard.quebrado')}">${equipamento.quantidadeQuebrada}</span>
        </div>
    `;
}

/** `termoBusca`: busca ativa que zerou a lista (distingue "sem resultados" de "nada cadastrado"). */
export function renderDashboardEstoqueContent(equipamentos: Equipamento[], termoBusca = ''): string {
    const header = html`
        <div class="estoque-header">
            <span>${t('dashboard.equipamento')}</span>
            <span>${t('dashboard.total')}</span>
            <span>${t('dashboard.disponivel')}</span>
            <span>${t('dashboard.quebrado')}</span>
        </div>
    `;

    const linhas = equipamentos.length
        ? equipamentos.map(renderDashboardEstoqueLinha).join('')
        : termoBusca.trim()
            ? renderEmptyStateSemResultados({ consulta: termoBusca, containerClass: 'estado-vazio-resultados', limpar: 'busca' })
            : html`<div class="dashboard-andamento-vazio" style="display:flex;"><p>${t('dashboard.nenhum_equipamento_cadastrado')}</p></div>`;

    return header + linhas;
}

export function renderDashboardAndamentoContent(loans: LoanUI[]): string {
    if (!loans.length) return '';

    return loans.map((loan) => {
        const itensTexto = loan.itens.map((item) => `${item.quantidade}x ${escapeHtml(item.nome)}`).join(', ');
        return html`
            <div class="dashboard-andamento-item">
                <span class="dashboard-andamento-resp">${raw(renderPessoaProtegida(loan.responsavel))}</span>
                <span class="dashboard-andamento-itens">${raw(itensTexto)}</span>
            </div>
        `;
    }).join('');
}

export function renderDashboardChip(item: LoanItemUI): string {
    const titulo = `${item.quantidade}x ${escapeHtml(item.nome)}`;
    return html`
        <span class="historico-item-chip" title="${raw(titulo)}">
            <span class="icon-badge icon-badge--sm icon-badge--primary">
                <span class="material-symbols-outlined">${getEquipamentoIcon(item.id)}</span>
            </span>
            <span class="historico-item-qtd">${item.quantidade}</span>
            <span class="historico-item-nome">${item.nome}</span>
        </span>
    `;
}

/**
 * Desktop: até `limiteChips` chips (ícone + quantidade) e "+N". Mobile (via CSS): só o 1º chip, com nome, seguido
 * do "+N" compacto (`historico-item-mais-compacto`, oculto no desktop) com o total de itens restantes.
 */
export function renderDashboardChipsItens(itens: LoanItemUI[], limiteChips: number = LIMITE_CHIPS_HISTORICO_PADRAO): string {
    const compacto = itens.length > 1
        ? html`<span class="historico-item-chip historico-item-chip-mais historico-item-mais-compacto">+${itens.length - 1}</span>`
        : '';

    if (itens.length <= limiteChips) {
        return itens.map(renderDashboardChip).join('') + compacto;
    }

    const visiveis = itens.slice(0, limiteChips);
    const restantes = itens.length - visiveis.length;

    return visiveis.map(renderDashboardChip).join('') +
        html`<span class="historico-item-chip historico-item-chip-mais">+${restantes}</span>` + compacto;
}

export function renderDashboardHistoricoContent(loans: LoanUI[], limiteChips: number = LIMITE_CHIPS_HISTORICO_PADRAO): string {
    if (!loans.length) return '';

    return loans.map((loan) => html`
        <div class="historico-row" data-id="${loan.id}">
            <span class="historico-numero" data-col="numero">#${loan.numero}</span>
            <span data-col="solicitante" data-label="Solicitante">${raw(renderPessoaProtegida(loan.aluno))}</span>
            <span data-col="responsavel" data-label="Responsável">${raw(renderPessoaProtegida(loan.responsavel))}</span>
            <span class="historico-data" data-col="retirada" data-label="Retirada">${formatarDataHora(loan.data)}</span>
            <span class="historico-data" data-col="devolucao" data-label="Devolução">${formatarDataHora(loan.dataDevolucao) || '—'}</span>
            <div class="historico-itens" data-col="itens" data-label="Itens">${raw(renderDashboardChipsItens(loan.itens, limiteChips))}</div>
            <span data-col="status" data-label="Status">${raw(renderStatusBadge(loan.status))}</span>
            <button type="button" class="btn btn-neutral btn-sm historico-detalhes-btn" data-id="${loan.id}">Detalhes</button>
        </div>
    `).join('');
}

export function renderDashboardHistoricoDetalheBody(loan: LoanUI): string {
    const itensHtml = loan.itens.map((item) => html`
        <li>
            <span class="icon-badge icon-badge--sm icon-badge--primary">
                <span class="material-symbols-outlined">${getEquipamentoIcon(item.id)}</span>
            </span>
            <span class="detalhe-item-nome">${item.quantidade}x ${item.nome}</span>
        </li>
    `).join('');

    const obsHtml = loan.observacao ? html`
        <div class="devolucao-detalhe-secao devolucao-detalhe-obs">
            <span class="detalhe-emprestimo-obs-label">${t('dashboard.observacao')}</span>
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
                        <span class="info-resp">${raw(renderPessoaProtegida(loan.responsavel))}</span>
                    <svg class="seta-svg" viewBox="0 0 40 12" xmlns="http://www.w3.org/2000/svg">
                        <line x1="0" y1="6" x2="32" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                        <polyline points="26,1 36,6 26,11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span class="info-value">${raw(renderPessoaProtegida(loan.aluno))}</span>
                </div>
                <span class="devolucao-detalhe-pessoa-data">Retirada em ${formatarDataHora(loan.data)}</span>
                <span class="devolucao-detalhe-pessoa-data">Devolução: ${formatarDataHora(loan.dataDevolucao) || '—'}</span>
            </div>
        </div>

        <div class="devolucao-detalhe-secao">
            <div class="devolucao-detalhe-secao-header">
                <span>${t('dashboard.itens_emprestados')}</span>
                <span class="devolucao-detalhe-contagem">(${loan.itens.length})</span>
            </div>
            <ul class="detalhe-emprestimo-lista">${raw(itensHtml)}</ul>
        </div>

        ${raw(obsHtml)}

        ${raw(envolverAutoria(renderAutoriaEmprestimo(loan)))}

        ${raw(renderStatusBadge(loan.status))}
    `;
}
