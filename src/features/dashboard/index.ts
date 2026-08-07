import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { getLoans, getLoansAbertos } from '../../core/state/loanStore.js';
import { ehLayoutEmpilhado } from '../../core/utils/viewport.js';
import { LAYOUT_EMPILHADO_BREAKPOINT } from '../../core/constants/breakpoints.js';
import { attachDashboardEvents } from './events.js';
import { renderEstoque, renderResumo, renderAndamento, renderHistorico, atualizarVisibilidadeDetalhe } from './render.js';
import type { DashboardEls, DashboardEstado } from './render.js';

export function initDashboard(): void {
    const estoqueContainer = document.getElementById('tab-estoque');
    if (!estoqueContainer) return;

    const els: DashboardEls = {
        estoqueContainer: estoqueContainer as HTMLElement,
        btnExportar: document.getElementById('btn-dashboard-exportar'),
        andamentoLista: document.getElementById('dashboard-andamento-lista') as HTMLElement,
        andamentoVazio: document.getElementById('dashboard-andamento-vazio') as HTMLElement,
        detalheConteudo: document.getElementById('dashboard-detalhe-conteudo') as HTMLElement,
        detalheTitulo: document.getElementById('dashboard-detalhe-titulo') as HTMLElement,
        detalheBody: document.getElementById('dashboard-detalhe-body') as HTMLElement,
        btnDetalheFechar: document.getElementById('btn-dashboard-detalhe-fechar'),
        detalheContainer: document.getElementById('dashboard-detalhe-container'),
        detalheEmpty: document.getElementById('dashboard-detalhe-empty'),
        historicoLista: document.getElementById('historico-lista') as HTMLElement,
        historicoVazio: document.getElementById('historico-vazio') as HTMLElement,
        modalCategoriaBody: document.getElementById('modal-categoria-body') as HTMLElement,
        btnModalCategoriaFechar: document.getElementById('modal-categoria-fechar'),
        resumoTotal: document.getElementById('resumo-total') as HTMLElement,
        resumoDisponivel: document.getElementById('resumo-disponivel') as HTMLElement,
        resumoEmprestado: document.getElementById('resumo-emprestado') as HTMLElement,
        resumoQuebrado: document.getElementById('resumo-quebrado') as HTMLElement,
        resumoDisponivelPct: document.getElementById('resumo-disponivel-pct') as HTMLElement,
        resumoEmprestadoPct: document.getElementById('resumo-emprestado-pct') as HTMLElement,
        resumoQuebradoPct: document.getElementById('resumo-quebrado-pct') as HTMLElement,
        resumoManutencao: document.getElementById('resumo-manutencao') as HTMLElement,
        resumoManutencaoPct: document.getElementById('resumo-manutencao-pct') as HTMLElement,
        inputBusca: document.getElementById('dashboard-busca') as HTMLInputElement | null
        
    };

    const estado: DashboardEstado = {
        equipamentoIdModalAtual: null,
        equipamentoIdPainelAtual: null,
        termoBusca: ''
    };

    attachDashboardEvents(els, estado);

    renderEstoque(els, getEquipamentos());
    renderResumo(els, getEquipamentos());
    renderAndamento(els, getLoansAbertos());
    renderHistorico(els, [...getLoans()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    atualizarVisibilidadeDetalhe(els, ehLayoutEmpilhado(LAYOUT_EMPILHADO_BREAKPOINT));
}