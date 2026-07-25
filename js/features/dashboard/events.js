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
    fecharTodosMenusEstoque,
    atualizarVisibilidadeDetalhe,
    abrirDetalheEstoque,
    abrirDetalheHistorico,
    fecharDetalhe
} from './render.js';
import { atualizarCategoria, exportarEstoqueCsv } from './service.js';

export function attachDashboardEvents(els, estado) {
    els.estoqueContainer.addEventListener('click', (e) => {
        const menuBtn = e.target.closest('.registros-row-menu-btn');
        if (menuBtn) {
            e.stopPropagation();
            const menu = menuBtn.nextElementSibling;
            const jaAberto = menu.classList.contains('active');
            fecharTodosMenusEstoque(els);
            if (!jaAberto) menu.classList.add('active');
            return;
        }

        const opcaoMenu = e.target.closest('.registros-row-menu-opcao');
        if (opcaoMenu) {
            const row = opcaoMenu.closest('.estoque-row');
            fecharTodosMenusEstoque(els);
            abrirDetalheEstoque(els, estado, row.dataset.equipamentoId, ehLayoutEmpilhado(LAYOUT_EMPILHADO_BREAKPOINT));
        }
    });

    document.addEventListener('click', () => fecharTodosMenusEstoque(els));

    if (els.detalheBody) {
        els.detalheBody.addEventListener('click', (e) => {
            if (e.target.closest('#btn-detalhe-estoque-cancelar')) {
                fecharDetalhe(els);
                return;
            }
            if (e.target.closest('#btn-detalhe-estoque-salvar-novo')) {
                salvarCategoria(els, estado, estado.equipamentoIdPainelAtual);
            }
        });
    }

    if (els.btnModalCategoriaSalvar) {
        els.btnModalCategoriaSalvar.addEventListener('click', () => {
            salvarCategoria(els, estado, estado.equipamentoIdModalAtual, 'modal-dashboard-categoria');
        });
    }

    if (els.btnModalCategoriaCancelar) {
        els.btnModalCategoriaCancelar.addEventListener('click', () => {
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

async function salvarCategoria(els, estado, equipamentoId, modalId = null) {
    if (!equipamentoId) return;

    const dados = {
        total: document.getElementById('detalhe-estoque-total')?.value || '0',
        disponivel: document.getElementById('detalhe-estoque-disponivel')?.value || '0',
        quebrado: document.getElementById('detalhe-estoque-quebrado')?.value || '0'
    };

    try {
        await atualizarCategoria(equipamentoId, dados);
        showToast('Categoria atualizada com sucesso', 'success');

        if (modalId) {
            closeModal(modalId);
            estado.equipamentoIdModalAtual = null;
        } else {
            fecharDetalhe(els);
        }
    } catch (erro) {
        showToast(erro instanceof Error ? erro.message : 'Erro ao atualizar categoria.', 'error');
    }
}