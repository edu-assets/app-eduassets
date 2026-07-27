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
import { exportarEstoqueCsv } from './service.js';

export function attachDashboardEvents(els, estado) {
    els.estoqueContainer.addEventListener('click', (e) => {
        const row = e.target.closest('.estoque-row');
        if (!row) return;
        abrirDetalheEstoque(els, estado, row.dataset.equipamentoId, ehLayoutEmpilhado(LAYOUT_EMPILHADO_BREAKPOINT));
    });

    if (els.detalheBody) {
        els.detalheBody.addEventListener('click', (e) => {
            if (e.target.closest('#btn-detalhe-estoque-fechar')) {
                fecharDetalhe(els);
            }
        });
    }

    if (els.btnModalCategoriaFechar) {
        els.btnModalCategoriaFechar.addEventListener('click', () => {
            estado.equipamentoIdModalAtual = null;
        });
    }

    document.querySelectorAll('.dashboard-tab-link').forEach((tabLink) => {
        tabLink.addEventListener('click', () => {
            ativarAbaDashboard(els, tabLink.dataset.tab);
            atualizarVisibilidadeDetalhe(els, ehLayoutEmpilhado(LAYOUT_EMPILHADO_BREAKPOINT));
            fecharDetalhe(els);
        });
    });

    if (els.btnDetalheFechar) els.btnDetalheFechar.addEventListener('click', () => fecharDetalhe(els));

    if (els.btnExportar) {
        els.btnExportar.addEventListener('click', () => {
            const abaAtiva = document.querySelector('.dashboard-tab-link.active')?.dataset.tab;

            if (abaAtiva === 'historico') {
                document.querySelector('.nav-link[data-panel="panel-exportar"]')?.click();
                return;
            }

            exportarEstoqueCsv(getEquipamentos());
            showToast('Exportação de estoque gerada com sucesso', 'success');
        });
    }

    els.historicoLista.addEventListener('click', (e) => {
        const btn = e.target.closest('.historico-detalhes-btn');
        if (!btn) return;
        const loan = getLoans().find((l) => String(l.id) === String(btn.dataset.id));
        if (loan) abrirDetalheHistorico(els, loan);
    });

    window.addEventListener('resize', () => atualizarVisibilidadeDetalhe(els, ehLayoutEmpilhado(LAYOUT_EMPILHADO_BREAKPOINT)));

    subscribeEquipamentos(() => {
        renderEstoque(els, getEquipamentos());
        renderResumo(els, getEquipamentos());
    });

    subscribeLoans(() => {
        renderAndamento(els, getLoansAbertos());
        renderHistorico(els, [...getLoans()].sort((a, b) => b.createdAt - a.createdAt));
    });
}