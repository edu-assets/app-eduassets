import { getLoans, getLoansAbertos, subscribe } from '../../core/state/loans.js';
import { showToast } from '../../core/toast/toast.js';
import { escapeHtml } from '../../core/utils/sanitize.js';

const EQUIPAMENTO_ICONS = {
    eq1: 'laptop',
    eq2: 'tablet',
    eq3: 'headphones',
    eq4: 'bolt',
    eq5: 'usb'
};

const LIMITE_CHIPS_HISTORICO = 2;

export function initDashboard() {
    const estoqueContainer = document.getElementById('tab-estoque');
    if (!estoqueContainer) return;

    const btnEditar = document.getElementById('btn-editar');
    const btnDeletar = document.getElementById('btn-deletar');
    const toolbar = document.getElementById('dashboard-toolbar');
    const btnExportar = document.getElementById('btn-dashboard-exportar');

    const andamentoWrap = document.getElementById('dashboard-andamento');
    const andamentoLista = document.getElementById('dashboard-andamento-lista');
    const andamentoVazio = document.getElementById('dashboard-andamento-vazio');

    const detalheConteudo = document.getElementById('dashboard-detalhe-conteudo');
    const detalheTitulo = document.getElementById('dashboard-detalhe-titulo');
    const detalheBody = document.getElementById('dashboard-detalhe-body');
    const btnDetalheFechar = document.getElementById('btn-dashboard-detalhe-fechar');

    const detalheContainer = document.getElementById('dashboard-detalhe-container');
    const detalheEmpty = document.getElementById('dashboard-detalhe-empty');

    const historicoLista = document.getElementById('historico-lista');
    const historicoVazio = document.getElementById('historico-vazio');

    const selecionados = new Set();
    let editandoId = null;

    /* ===== Estoque: seleção + checkbox ===== */
    estoqueContainer.addEventListener('change', (e) => {
        if (!e.target.classList.contains('estoque-checkbox')) return;
        const id = e.target.dataset.id;
        e.target.checked ? selecionados.add(id) : selecionados.delete(id);
        atualizarToolbar();
    });

    estoqueContainer.addEventListener('click', (e) => {
        const row = e.target.closest('.estoque-row');
        if (!row) return;
        if (e.target.closest('.estoque-checkbox-wrap')) return;

        estoqueContainer.querySelectorAll('.estoque-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');

        abrirDetalheEstoque(row);
    });

    function atualizarToolbar() {
        if (btnEditar) btnEditar.disabled = selecionados.size !== 1;
        if (btnDeletar) btnDeletar.disabled = selecionados.size === 0;
    }

    if (btnEditar) {
        btnEditar.addEventListener('click', () => {
            if (selecionados.size !== 1) return;
            const id = [...selecionados][0];
            const row = estoqueContainer.querySelector(`.estoque-row[data-id="${id}"]`);
            abrirDetalheEstoque(row);
        });
    }

    if (btnDeletar) {
        btnDeletar.addEventListener('click', () => {
            selecionados.forEach((id) => {
                estoqueContainer.querySelector(`.estoque-row[data-id="${id}"]`)?.remove();
            });
            if (editandoId && selecionados.has(editandoId)) fecharDetalhe();
            selecionados.clear();
            atualizarToolbar();
            atualizarResumo();
        });
    }

    /* ===== Detalhe: Estoque (editar categoria) ===== */
    function abrirDetalheEstoque(row) {
        if (!row) return;
        editandoId = row.dataset.id;

        detalheTitulo.textContent = "Editar categoria";

        const total = Number(row.dataset.total) || 0;
        const disp = Number(row.dataset.disponivel) || 0;
        const queb = Number(row.dataset.quebrado) || 0;
        const emp = Math.max(0, total - disp - queb);

        detalheBody.innerHTML = `
            <p class="category-edit-subtitle">Atualize as informações da categoria.</p>
            
            <!-- Campo: Nome da Categoria -->
            <div class="form-group margin-bottom-lg">
                <label class="category-field-label">Nome da categoria <span class="required-asterisk">*</span></label>
                <input type="text" id="detalhe-estoque-categoria" class="category-field-input" value="${escapeHtml(row.dataset.categoria)}" disabled>
            </div>

            <!-- Quadro: Resumo e Métricas da Categoria -->
            <div class="category-summary-box">
                <h4 class="category-summary-box-title">Resumo da categoria</h4>
                
                <div class="category-summary-grid">
                    
                    <!-- Métrica: Total -->
                    <div class="category-metric-col col-total">
                        <div class="metric-icon-wrap">
                            <span class="material-symbols-outlined">devices</span>
                        </div>
                        <input type="number" id="detalhe-estoque-total" min="0" value="${total}">
                        <label for="detalhe-estoque-total">Total</label>
                    </div>

                    <!-- Métrica: Disponíveis -->
                    <div class="category-metric-col col-disponivel">
                        <div class="metric-icon-wrap">
                            <span class="material-symbols-outlined">check_circle</span>
                        </div>
                        <input type="number" id="detalhe-estoque-disponivel" min="0" value="${disp}">
                        <label for="detalhe-estoque-disponivel">Disponíveis</label>
                    </div>

                    <!-- Métrica: Emprestados (Calculado/Read-only) -->
                    <div class="category-metric-col col-emprestado">
                        <div class="metric-icon-wrap">
                            <span class="material-symbols-outlined">schedule</span>
                        </div>
                        <div class="metric-readonly-value">${emp}</div>
                        <label>Emprestados</label>
                    </div>

                    <!-- Métrica: Quebrados -->
                    <div class="category-metric-col col-quebrado">
                        <div class="metric-icon-wrap">
                            <span class="material-symbols-outlined">warning</span>
                        </div>
                        <input type="number" id="detalhe-estoque-quebrado" min="0" value="${queb}">
                        <label for="detalhe-estoque-quebrado">Quebrados</label>
                    </div>

                </div>
            </div>

            <!-- Rodapé de Ações do Formulário -->
            <div class="category-edit-actions">
                <button type="button" class="btn btn-neutral" id="btn-detalhe-estoque-cancelar">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btn-detalhe-estoque-salvar-novo">
                    <span class="material-symbols-outlined">save</span> Salvar alterações
                </button>
            </div>
        `;

        document.getElementById('btn-detalhe-estoque-cancelar').addEventListener('click', fecharDetalhe);
        document.getElementById('btn-detalhe-estoque-salvar-novo').addEventListener('click', () => {
            salvarDetalheEstoque(row);
        });

        mostrarDetalhe();
    }

    function salvarDetalheEstoque(row) {
        const novoTotal = document.getElementById('detalhe-estoque-total')?.value || '0';
        const novoDisponivel = document.getElementById('detalhe-estoque-disponivel')?.value || '0';
        const novoQuebrado = document.getElementById('detalhe-estoque-quebrado')?.value || '0';

        row.dataset.total = novoTotal;
        row.dataset.disponivel = novoDisponivel;
        row.dataset.quebrado = novoQuebrado;

        setCol(row, 'total', novoTotal);
        setCol(row, 'disponivel', novoDisponivel);
        setCol(row, 'quebrado', novoQuebrado);

        showToast('Categoria atualizada com sucesso', 'success');
        fecharDetalhe();
        atualizarResumo();
    }

    function setCol(row, col, value) {
        const el = row.querySelector(`[data-col="${col}"]`);
        if (el) el.textContent = value;
    }

    /* ===== Detalhe: Histórico (visualização de empréstimo) ===== */
    function abrirDetalheHistorico(loan) {
        editandoId = null;

        detalheTitulo.textContent = `Empréstimo #${loan.numero}`;

        const itensHtml = loan.itens.map((item) => `
            <li>
                <span class="material-symbols-outlined">${EQUIPAMENTO_ICONS[item.id] || 'devices_other'}</span>
                <span class="detalhe-item-nome">${item.quantidade}x ${escapeHtml(item.nome)}</span>
            </li>
        `).join('');

        const obsHtml = loan.observacao ? `
            <div class="devolucao-detalhe-secao devolucao-detalhe-obs">
                <span class="detalhe-emprestimo-obs-label">Observação</span>
                <p>${escapeHtml(loan.observacao)}</p>
            </div>
        ` : '';

        detalheBody.innerHTML = `
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

        mostrarDetalhe();
    }

    function mostrarDetalhe() {
        if (detalheEmpty) detalheEmpty.style.display = 'none';
        detalheConteudo.style.display = 'block';
    }

    function fecharDetalhe() {
        editandoId = null;
        detalheConteudo.style.display = 'none';
        if (detalheEmpty) detalheEmpty.style.display = 'flex';
        estoqueContainer.querySelectorAll('.estoque-row').forEach(r => r.classList.remove('selected'));
    }

    if (btnDetalheFechar) btnDetalheFechar.addEventListener('click', fecharDetalhe);

    /* ===== Tabs: Estoque | Histórico ===== */
    document.querySelectorAll('.dashboard-tab-link').forEach((tabLink) => {
        tabLink.addEventListener('click', () => {
            document.querySelectorAll('.dashboard-tab-link').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.dashboard-tab-content').forEach(c => c.classList.remove('active'));

            tabLink.classList.add('active');
            const targetTab = document.getElementById(`tab-${tabLink.dataset.tab}`);
            if (targetTab) targetTab.classList.add('active');

            if (detalheContainer) {
                detalheContainer.style.display = tabLink.dataset.tab === 'estoque' ? 'flex' : 'none';
            }

            fecharDetalhe();
        });
    });

    /* ===== Exportar ===== */
    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            const abaAtiva = document.querySelector('.dashboard-tab-link.active')?.dataset.tab;

            if (abaAtiva === 'historico') {
                document.querySelector('.nav-link[data-panel="panel-exportar"]')?.click();
                return;
            }

            exportarEstoqueCsv();
        });
    }

    function exportarEstoqueCsv() {
        const linhas = [['Categoria', 'Total', 'Disponivel', 'Quebrado']];
        estoqueContainer.querySelectorAll('.estoque-row').forEach((row) => {
            linhas.push([row.dataset.categoria, row.dataset.total, row.dataset.disponivel, row.dataset.quebrado]);
        });

        const csv = linhas.map((linha) => linha.join(';')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `estoque-eduassets-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('Exportação de estoque gerada com sucesso', 'success');
    }

    /* ===== Cards de resumo ===== */
    function atualizarResumo() {
        let totalGeral = 0, dispGeral = 0, quebGeral = 0;

        estoqueContainer.querySelectorAll('.estoque-row').forEach((row) => {
            totalGeral += Number(row.dataset.total) || 0;
            dispGeral += Number(row.dataset.disponivel) || 0;
            quebGeral += Number(row.dataset.quebrado) || 0;
        });

        const emprestGeral = Math.max(0, totalGeral - dispGeral - quebGeral);

        document.getElementById('resumo-total').textContent = totalGeral;
        document.getElementById('resumo-disponivel').textContent = dispGeral;
        document.getElementById('resumo-emprestado').textContent = emprestGeral;
        document.getElementById('resumo-quebrado').textContent = quebGeral;

        document.getElementById('resumo-disponivel-pct').textContent = `${formatarPct(dispGeral, totalGeral)} do total`;
        document.getElementById('resumo-emprestado-pct').textContent = `${formatarPct(emprestGeral, totalGeral)} do total`;
        document.getElementById('resumo-quebrado-pct').textContent = `${formatarPct(quebGeral, totalGeral)} do total`;
    }

    function formatarPct(valor, total) {
        if (!total) return '0%';
        return `${(valor / total * 100).toFixed(1).replace('.', ',')}%`;
    }

    /* ===== Empréstimos em andamento (painel lateral) ===== */
    function renderAndamento() {
        const abertos = getLoansAbertos();

        if (!abertos.length) {
            andamentoLista.innerHTML = '';
            andamentoVazio.style.display = 'flex';
            return;
        }

        andamentoVazio.style.display = 'none';
        andamentoLista.innerHTML = abertos.map((loan) => `
            <div class="dashboard-andamento-item">
                <span class="dashboard-andamento-resp">${escapeHtml(loan.responsavel)}</span>
                <span class="dashboard-andamento-itens">${loan.itens.map((i) => `${i.quantidade}x ${escapeHtml(i.nome)}`).join(', ')}</span>
            </div>
        `).join('');
    }

    /* ===== Histórico ===== */
    function renderHistorico() {
        const loans = [...getLoans()].sort((a, b) => b.createdAt - a.createdAt);

        if (!loans.length) {
            historicoLista.innerHTML = '';
            historicoVazio.style.display = 'flex';
            return;
        }

        historicoVazio.style.display = 'none';
        historicoLista.innerHTML = loans.map((loan) => `
        <div class="historico-row" data-id="${loan.id}">
            <span class="historico-numero" data-col="numero">#${loan.numero}</span>
            <span data-col="solicitante" data-label="Solicitante">${escapeHtml(loan.aluno)}</span>
            <span data-col="responsavel" data-label="Responsável">${escapeHtml(loan.responsavel)}</span>
            <span class="historico-data" data-col="retirada" data-label="Retirada">${loan.data}</span>
            <span class="historico-data" data-col="devolucao" data-label="Devolução">${loan.dataDevolucao || '—'}</span>
            <div class="historico-itens" data-col="itens" data-label="Itens">${renderChipsItens(loan.itens)}</div>
            <span class="historico-status-badge historico-status-${loan.status}" data-col="status" data-label="Status">
                ${loan.status === 'aberto' ? 'Aberto' : 'Devolvido'}
            </span>
            <button type="button" class="btn btn-neutral btn-sm historico-detalhes-btn" data-id="${loan.id}">Detalhes</button>
        </div>
    `).join('');
    }

    historicoLista.addEventListener('click', (e) => {
        const btn = e.target.closest('.historico-detalhes-btn');
        if (!btn) return;
        const loan = getLoans().find((l) => l.id === btn.dataset.id);
        if (loan) abrirDetalheHistorico(loan);
    });

    function renderChipsItens(itens) {
        if (itens.length <= LIMITE_CHIPS_HISTORICO) {
            return itens.map(renderChip).join('');
        }

        const visiveis = itens.slice(0, LIMITE_CHIPS_HISTORICO);
        const restantes = itens.length - visiveis.length;

        return visiveis.map(renderChip).join('') +
            `<span class="historico-item-chip historico-item-chip-mais">+${restantes}</span>`;
    }

    function renderChip(item) {
        return `
            <span class="historico-item-chip" title="${item.quantidade}x ${escapeHtml(item.nome)}">
                <span class="material-symbols-outlined">${EQUIPAMENTO_ICONS[item.id] || 'devices_other'}</span>${item.quantidade}
            </span>
        `;
    }

    /* ===== Inicialização ===== */
    atualizarResumo();
    renderAndamento();
    renderHistorico();
    subscribe(() => {
        renderAndamento();
        renderHistorico();
    });
}