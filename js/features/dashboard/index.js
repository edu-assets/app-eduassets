import { getEquipamentos, subscribe as subscribeEquipamentos } from '../../core/state/equipamentoStore.js';
import { getLoans, getLoansAbertos } from '../../core/state/loanStore.js';
import { ehLayoutEmpilhado } from '../../core/utils/viewport.js';
import { LAYOUT_EMPILHADO_BREAKPOINT } from '../../core/constants/breakpoints.js';
import { attachDashboardEvents } from './events.js';
import { renderEstoque, renderResumo, renderAndamento, renderHistorico, atualizarVisibilidadeDetalhe } from './render.js';

export function initDashboard() {
    const estoqueContainer = document.getElementById('tab-estoque');
    if (!estoqueContainer) return;

    const els = {
        estoqueContainer,
        btnExportar: document.getElementById('btn-dashboard-exportar'),
        andamentoLista: document.getElementById('dashboard-andamento-lista'),
        andamentoVazio: document.getElementById('dashboard-andamento-vazio'),
        detalheConteudo: document.getElementById('dashboard-detalhe-conteudo'),
        detalheTitulo: document.getElementById('dashboard-detalhe-titulo'),
        detalheBody: document.getElementById('dashboard-detalhe-body'),
        btnDetalheFechar: document.getElementById('btn-dashboard-detalhe-fechar'),
        detalheContainer: document.getElementById('dashboard-detalhe-container'),
        detalheEmpty: document.getElementById('dashboard-detalhe-empty'),
        historicoLista: document.getElementById('historico-lista'),
        historicoVazio: document.getElementById('historico-vazio'),
        modalCategoriaBody: document.getElementById('modal-categoria-body'),
        btnModalCategoriaFechar: document.getElementById('modal-categoria-fechar'),
        resumoTotal: document.getElementById('resumo-total'),
        resumoDisponivel: document.getElementById('resumo-disponivel'),
        resumoEmprestado: document.getElementById('resumo-emprestado'),
        resumoQuebrado: document.getElementById('resumo-quebrado'),
        resumoDisponivelPct: document.getElementById('resumo-disponivel-pct'),
        resumoEmprestadoPct: document.getElementById('resumo-emprestado-pct'),
        resumoQuebradoPct: document.getElementById('resumo-quebrado-pct'),
        resumoManutencao: document.getElementById('resumo-manutencao'),
        resumoManutencaoPct: document.getElementById('resumo-manutencao-pct'),
    };

    const estado = {
        equipamentoIdModalAtual: null,
        equipamentoIdPainelAtual: null
    };

    attachDashboardEvents(els, estado);

    renderEstoque(els, getEquipamentos());
    renderResumo(els, getEquipamentos());
    renderAndamento(els, getLoansAbertos());
    renderHistorico(els, [...getLoans()].sort((a, b) => b.createdAt - a.createdAt));
    atualizarVisibilidadeDetalhe(els, ehLayoutEmpilhado(LAYOUT_EMPILHADO_BREAKPOINT));
}