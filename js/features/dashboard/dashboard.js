import { getLoans, getLoansAbertos, subscribe } from '../../core/state/loans.js';
import { getEquipamentos, subscribe as subscribeEquipamentos, atualizarEquipamentoPorId } from '../../core/state/equipamentoStore.js';
import { showToast, openModal, closeModal } from '../../core/ui/index.js';
import {
    renderDashboardCategoriaForm,
    renderDashboardEstoqueContent,
    renderDashboardAndamentoContent,
    renderDashboardHistoricoContent,
    renderDashboardHistoricoDetalheBody
} from './dashboardTemplates.js';

const LIMITE_CHIPS_HISTORICO = 2;
const BREAKPOINT_LAYOUT_EMPILHADO = 1024;

export function initDashboard() {
    const estoqueContainer = document.getElementById('tab-estoque');
    if (!estoqueContainer) return;

    const btnExportar = document.getElementById('btn-dashboard-exportar');

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

    const modalCategoriaBody = document.getElementById('modal-categoria-body');
    const btnModalCategoriaSalvar = document.getElementById('modal-categoria-salvar');
    const btnModalCategoriaCancelar = document.getElementById('modal-categoria-cancelar');

    let rowModalAtual = null;

    renderEstoque(getEquipamentos());

    /* ===== Estoque: menu de ações por linha ===== */
    estoqueContainer.addEventListener('click', (e) => {
        const menuBtn = e.target.closest('.registros-row-menu-btn');
        if (menuBtn) {
            e.stopPropagation();
            const menu = menuBtn.nextElementSibling;
            const jaAberto = menu.classList.contains('active');
            fecharTodosMenusEstoque();
            if (!jaAberto) menu.classList.add('active');
            return;
        }

        const opcaoMenu = e.target.closest('.registros-row-menu-opcao');
        if (opcaoMenu) {
            const row = opcaoMenu.closest('.estoque-row');
            fecharTodosMenusEstoque();
            abrirDetalheEstoque(row);
        }
    });

    document.addEventListener('click', () => fecharTodosMenusEstoque());

    function fecharTodosMenusEstoque() {
        estoqueContainer.querySelectorAll('.registros-row-menu.active').forEach((menu) => menu.classList.remove('active'));
    }

    function ehLayoutEmpilhado() {
        return window.matchMedia(`(max-width: ${BREAKPOINT_LAYOUT_EMPILHADO}px)`).matches;
    }

    function atualizarVisibilidadeDetalhe() {
        if (!detalheContainer) return;
        const abaAtiva = document.querySelector('.dashboard-tab-link.active')?.dataset.tab;
        detalheContainer.style.display = (abaAtiva === 'estoque' && !ehLayoutEmpilhado()) ? 'flex' : 'none';
    }

    /* ===== Detalhe: Estoque (editar categoria) ===== */
    function construirFormularioCategoria(row) {
        return renderDashboardCategoriaForm(row);
    }

    function abrirDetalheEstoque(row) {
        if (!row) return;

        if (ehLayoutEmpilhado()) {
            abrirModalCategoria(row);
            return;
        }

        detalheTitulo.textContent = 'Editar categoria';

        detalheBody.innerHTML = construirFormularioCategoria(row) + `
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
            fecharDetalhe();
        });

        mostrarDetalhe();
    }

    function abrirModalCategoria(row) {
        rowModalAtual = row;
        modalCategoriaBody.innerHTML = construirFormularioCategoria(row);
        openModal('modal-dashboard-categoria');
    }

    if (btnModalCategoriaSalvar) {
        btnModalCategoriaSalvar.addEventListener('click', async () => {
            if (!rowModalAtual) return;
            await salvarDetalheEstoque(rowModalAtual);
            closeModal('modal-dashboard-categoria');
            rowModalAtual = null;
        });
    }

    if (btnModalCategoriaCancelar) {
        btnModalCategoriaCancelar.addEventListener('click', () => {
            rowModalAtual = null;
        });
    }

    async function salvarDetalheEstoque(row) {
        const novoTotal = document.getElementById('detalhe-estoque-total')?.value || '0';
        const novoDisponivel = document.getElementById('detalhe-estoque-disponivel')?.value || '0';
        const novoQuebrado = document.getElementById('detalhe-estoque-quebrado')?.value || '0';

        await atualizarEquipamentoPorId(Number(row.dataset.equipamentoId), {
            quantidadeTotal: Number(novoTotal),
            quantidadeDisponivel: Number(novoDisponivel),
            quantidadeQuebrada: Number(novoQuebrado)
        });

        showToast('Categoria atualizada com sucesso', 'success');
    }

    /* ===== Detalhe: Histórico (visualização de empréstimo) ===== */
    function abrirDetalheHistorico(loan) {
        detalheTitulo.textContent = `Empréstimo #${loan.numero}`;
        detalheBody.innerHTML = renderDashboardHistoricoDetalheBody(loan);

        mostrarDetalhe();
    }

    function mostrarDetalhe() {
        if (detalheEmpty) detalheEmpty.style.display = 'none';
        detalheConteudo.style.display = 'block';
    }

    function fecharDetalhe() {
        detalheConteudo.style.display = 'none';
        if (detalheEmpty) detalheEmpty.style.display = 'flex';
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

            atualizarVisibilidadeDetalhe();

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
        let totalGeral = 0;
        let dispGeral = 0;
        let quebGeral = 0;

        getEquipamentos().forEach((equipamento) => {
            totalGeral += Number(equipamento.quantidadeTotal) || 0;
            dispGeral += Number(equipamento.quantidadeDisponivel) || 0;
            quebGeral += Number(equipamento.quantidadeQuebrada) || 0;
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

    function renderEstoque(equipamentos) {
        estoqueContainer.innerHTML = renderDashboardEstoqueContent(equipamentos);
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
        andamentoLista.innerHTML = renderDashboardAndamentoContent(abertos);
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
        historicoLista.innerHTML = renderDashboardHistoricoContent(loans, LIMITE_CHIPS_HISTORICO);
    }

    historicoLista.addEventListener('click', (e) => {
        const btn = e.target.closest('.historico-detalhes-btn');
        if (!btn) return;
        const loan = getLoans().find((l) => l.id === btn.dataset.id);
        if (loan) abrirDetalheHistorico(loan);
    });

    /* ===== Inicialização ===== */
    atualizarResumo();
    subscribeEquipamentos(() => {
        renderEstoque(getEquipamentos());
        atualizarResumo();
    });
    renderAndamento();
    renderHistorico();
    atualizarVisibilidadeDetalhe();
    window.addEventListener('resize', atualizarVisibilidadeDetalhe);
    subscribe(() => {
        renderAndamento();
        renderHistorico();
    });
}