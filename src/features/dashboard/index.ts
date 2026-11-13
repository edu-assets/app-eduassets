import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { attachDashboardEvents, renderHistoricoAtual } from './events.js';
import { garantirBarraFiltros } from './filtros.js';
import { renderEstoque, renderResumo } from './render.js';
import type { DashboardEls, DashboardEstado } from './render.js';

export function initDashboard(): void {
    const estoqueContainer = document.getElementById('tab-estoque');
    if (!estoqueContainer) return;

    const els: DashboardEls = {
        estoqueContainer: estoqueContainer as HTMLElement,
        btnExportar: document.getElementById('btn-dashboard-exportar'),
        detalheDrawer: document.getElementById('dashboard-detalhe-drawer'),
        detalheBackdrop: document.getElementById('dashboard-detalhe-backdrop'),
        detalheTitulo: document.getElementById('dashboard-detalhe-titulo') as HTMLElement,
        detalheBody: document.getElementById('dashboard-detalhe-body') as HTMLElement,
        btnDetalheFechar: document.getElementById('btn-dashboard-detalhe-fechar'),
        historicoLista: document.getElementById('historico-lista') as HTMLElement,
        historicoVazio: document.getElementById('historico-vazio') as HTMLElement,
        historicoFiltros: garantirBarraFiltros(),
        historicoPaginacao: document.getElementById('historico-paginacao'),
        historicoContagem: document.getElementById('historico-contagem'),
        btnCarregarMais: document.getElementById('btn-historico-carregar-mais') as HTMLButtonElement | null,
        resumoTotal: document.getElementById('resumo-total') as HTMLElement,
        resumoDisponivel: document.getElementById('resumo-disponivel') as HTMLElement,
        resumoEmprestado: document.getElementById('resumo-emprestado') as HTMLElement,
        resumoQuebrado: document.getElementById('resumo-quebrado') as HTMLElement,
        resumoManutencao: document.getElementById('resumo-manutencao') as HTMLElement,
        inputBusca: document.getElementById('dashboard-busca') as HTMLInputElement | null
    };

    const estado: DashboardEstado = {
        termoBusca: ''
    };

    attachDashboardEvents(els, estado);

    renderEstoque(els, getEquipamentos());
    renderResumo(els, getEquipamentos());
    renderHistoricoAtual(els, estado);
    // As atualizações dos stores são assinadas em attachDashboardEvents, já respeitando o termo de busca.
}