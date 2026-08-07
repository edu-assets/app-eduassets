import { showToast, closeModal } from '../../core/ui/index.js';
import { getEquipamentos, subscribe as subscribeEquipamentos } from '../../core/state/equipamentoStore.js';
import { getLoans, getLoansAbertos, subscribe as subscribeLoans } from '../../core/state/loanStore.js';
import { ehLayoutEmpilhado } from '../../core/utils/viewport.js';
import { LAYOUT_EMPILHADO_BREAKPOINT } from '../../core/constants/breakpoints.js';
import {
    renderEstoque,
    renderResumo,
    renderAndamento,
    renderHistorico,
    ativarAbaDashboard,
    atualizarVisibilidadeDetalhe,
    abrirDetalheEstoque,
    abrirDetalheHistorico,
    fecharDetalhe
} from './render.js';
import type { DashboardEls, DashboardEstado } from './render.js';
import { exportarEstoqueCsv, filtrarEquipamentos, filtrarHistorico } from './service.js';
import { subscribe as subscribeOcorrencias } from '../../core/state/ocorrenciasStore.js';


export function attachDashboardEvents(els: DashboardEls, estado: DashboardEstado): void {
    els.estoqueContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const row = target.closest<HTMLElement>('.estoque-row');
        if (!row) return;
        abrirDetalheEstoque(els, estado, row.dataset.equipamentoId ?? '', ehLayoutEmpilhado(LAYOUT_EMPILHADO_BREAKPOINT));
    });

    if (els.detalheBody) {
        els.detalheBody.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('#btn-detalhe-estoque-fechar')) {
                fecharDetalhe(els);
            }
        });
    }

    if (els.inputBusca) {
        els.inputBusca.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            estado.termoBusca = target.value;

            const equipamentosFiltrados = filtrarEquipamentos(getEquipamentos(), estado.termoBusca);
            renderEstoque(els, equipamentosFiltrados);

            const loansOrdenados = [...getLoans()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            const loansFiltrados = filtrarHistorico(loansOrdenados, estado.termoBusca);
            renderHistorico(els, loansFiltrados);
        });
    }

    if (els.btnModalCategoriaFechar) {
        els.btnModalCategoriaFechar.addEventListener('click', () => {
            estado.equipamentoIdModalAtual = null;
            closeModal('modal-dashboard-categoria');
        });
    }

    document.querySelectorAll<HTMLElement>('.dashboard-tab-link').forEach((tabLink) => {
        tabLink.addEventListener('click', () => {
            ativarAbaDashboard(els, tabLink.dataset.tab ?? '');
            atualizarVisibilidadeDetalhe(els, ehLayoutEmpilhado(LAYOUT_EMPILHADO_BREAKPOINT));
            fecharDetalhe(els);
        });
    });

    if (els.btnDetalheFechar) els.btnDetalheFechar.addEventListener('click', () => fecharDetalhe(els));

    if (els.btnExportar) {
        els.btnExportar.addEventListener('click', () => {
            const abaAtiva = document.querySelector<HTMLElement>('.dashboard-tab-link.active')?.dataset.tab;

            if (abaAtiva === 'historico') {
                document.querySelector<HTMLElement>('.nav-link[data-panel="panel-exportar"]')?.click();
                return;
            }

            exportarEstoqueCsv(getEquipamentos());
            showToast('Exportação de estoque gerada com sucesso', 'success');
        });
    }

    els.historicoLista.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btn = target.closest<HTMLElement>('.historico-detalhes-btn');
        if (!btn) return;
        const loan = getLoans().find((l) => String(l.id) === String(btn.dataset.id));
        if (loan) abrirDetalheHistorico(els, loan);
    });

    window.addEventListener('resize', () => atualizarVisibilidadeDetalhe(els, ehLayoutEmpilhado(LAYOUT_EMPILHADO_BREAKPOINT)));

    subscribeEquipamentos(() => {
        const equipamentos = getEquipamentos();
        renderEstoque(els, filtrarEquipamentos(equipamentos, estado.termoBusca));
        renderResumo(els, equipamentos); 
    });

    subscribeLoans(() => {
        renderAndamento(els, getLoansAbertos());
        const loansOrdenados = [...getLoans()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        renderHistorico(els, filtrarHistorico(loansOrdenados, estado.termoBusca));
    });

    subscribeOcorrencias(() => {
        renderResumo(els, getEquipamentos());
    });
}