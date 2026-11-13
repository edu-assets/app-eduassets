import { calcularResumo, calcularEmprestado, calcularManutencao } from './service.js';
import {
    renderDashboardCategoriaForm,
    renderDashboardEstoqueContent,
    renderDashboardHistoricoContent,
    renderDashboardHistoricoDetalheBody
} from './templates.js';
import { abrirPainelOverlay, fecharPainelOverlay } from '../../shared/dom/overlayPanel.js';
import type { Equipamento, LoanUI, CategoriaResumoDados } from '../../types/index.js';
import { renderAutoriaEquipamento, envolverAutoria } from '../../shared/components/autoria.js';
import { t } from '../../core/state/i18nStore.js';
import { sincronizarAbasAria } from '../../shared/dom/tabs.js';
import { getLoadStatus } from '../../core/state/loadStatus.js';
import { aplicarEstadoCarga, renderSkeletonLinhas, semDadosProntos, CONTADOR_INDISPONIVEL } from '../../shared/components/loadState.js';

const LIMITE_CHIPS_HISTORICO = 2;

export interface DashboardEls {
    estoqueContainer: HTMLElement;
    btnExportar: HTMLElement | null;
    detalheDrawer: HTMLElement | null;
    detalheBackdrop: HTMLElement | null;
    detalheTitulo: HTMLElement;
    detalheBody: HTMLElement;
    btnDetalheFechar: HTMLElement | null;
    historicoLista: HTMLElement;
    historicoVazio: HTMLElement;
    resumoTotal: HTMLElement;
    resumoDisponivel: HTMLElement;
    resumoEmprestado: HTMLElement;
    resumoQuebrado: HTMLElement;
    resumoDisponivelPct: HTMLElement;
    resumoEmprestadoPct: HTMLElement;
    resumoQuebradoPct: HTMLElement;
    resumoManutencao: HTMLElement;
    resumoManutencaoPct: HTMLElement;
    inputBusca: HTMLInputElement | null;
}

export interface DashboardEstado {
    termoBusca: string;
}

export function renderEstoque(els: DashboardEls, equipamentos: Equipamento[]): void {
    if (aplicarEstadoCarga(els.estoqueContainer, getLoadStatus('equipamentos').status, renderSkeletonLinhas(6))) return;
    els.estoqueContainer.innerHTML = renderDashboardEstoqueContent(equipamentos);
}

export function renderResumo(els: DashboardEls, equipamentos: Equipamento[]): void {
    const resumo = calcularResumo(equipamentos);
    const indisponivel = semDadosProntos(getLoadStatus('equipamentos').status);
    const cards = [els.resumoTotal, els.resumoDisponivel, els.resumoEmprestado, els.resumoQuebrado, els.resumoManutencao];
    cards.forEach((el) => {
        const card = el.closest('.dashboard-resumo-card');
        if (indisponivel) card?.setAttribute('aria-busy', 'true'); else card?.removeAttribute('aria-busy');
    });
    if (indisponivel) {
        cards.forEach((el) => { el.textContent = CONTADOR_INDISPONIVEL; });
        [els.resumoDisponivelPct, els.resumoEmprestadoPct, els.resumoQuebradoPct, els.resumoManutencaoPct]
            .forEach((el) => { el.textContent = CONTADOR_INDISPONIVEL; });
        return;
    }

    els.resumoTotal.textContent = String(resumo.total);
    els.resumoDisponivel.textContent = String(resumo.disponivel);
    els.resumoEmprestado.textContent = String(resumo.emprestado);
    els.resumoQuebrado.textContent = String(resumo.quebrado);
    els.resumoManutencao.textContent = String(resumo.manutencao);

    els.resumoDisponivelPct.textContent = `${resumo.disponivelPct} / Total`;
    els.resumoEmprestadoPct.textContent = `${resumo.emprestadoPct} / Total`;
    els.resumoQuebradoPct.textContent = `${resumo.quebradoPct} / Total`;
    els.resumoManutencaoPct.textContent = `${resumo.manutencaoPct} / Total`;
}

export function renderHistorico(els: DashboardEls, loans: LoanUI[]): void {
    if (aplicarEstadoCarga(els.historicoLista, getLoadStatus('emprestimos').status, renderSkeletonLinhas(5))) {
        els.historicoVazio.style.display = 'none';
        return;
    }
    if (!loans.length) {
        els.historicoLista.innerHTML = '';
        els.historicoVazio.style.display = 'flex';
        return;
    }

    els.historicoVazio.style.display = 'none';
    els.historicoLista.innerHTML = renderDashboardHistoricoContent(loans, LIMITE_CHIPS_HISTORICO);
}

export function ativarAbaDashboard(els: DashboardEls, tab: string): void {
    document.querySelectorAll('.dashboard-tab-link').forEach((tabEl) => tabEl.classList.remove('active'));
    document.querySelectorAll('.dashboard-tab-content').forEach((c) => c.classList.remove('active'));

    const tabLink = document.querySelector(`.dashboard-tab-link[data-tab="${tab}"]`);
    const targetTab = document.getElementById(`tab-${tab}`);

    if (tabLink) tabLink.classList.add('active');
    if (targetTab) targetTab.classList.add('active');
    sincronizarAbasAria(document.querySelectorAll('.dashboard-tab-link'));
}

function montarDadosFormularioCategoria(equipamento: Equipamento): CategoriaResumoDados {
    return {
        id: equipamento.id,
        modelo: equipamento.modelo,
        categoria: equipamento.categoria?.nome ?? '',
        total: equipamento.quantidadeTotal,
        disponivel: equipamento.quantidadeDisponivel,
        emprestado: calcularEmprestado(equipamento),
        manutencao: calcularManutencao(equipamento),
        quebrado: equipamento.quantidadeQuebrada
    };
}

export function exibirDetalheEstoque(els: DashboardEls, equipamento: Equipamento): void {
    const dadosFormulario = montarDadosFormularioCategoria(equipamento);

    els.detalheTitulo.textContent = t('dashboard.detalhes_do_equipamento');
    els.detalheBody.innerHTML = renderDashboardCategoriaForm(dadosFormulario)
        + envolverAutoria(renderAutoriaEquipamento(equipamento));

    abrirDetalhe(els);
}

export function abrirDetalheHistorico(els: DashboardEls, loan: LoanUI): void {
    els.detalheTitulo.textContent = `Empréstimo #${loan.numero}`;
    els.detalheBody.innerHTML = renderDashboardHistoricoDetalheBody(loan);
    abrirDetalhe(els);
}

function abrirDetalhe(els: DashboardEls): void {
    if (!els.detalheDrawer) return;
    abrirPainelOverlay({ painel: els.detalheDrawer, backdrop: els.detalheBackdrop }, 'open', 'active');
}

export function fecharDetalhe(els: DashboardEls): void {
    if (!els.detalheDrawer) return;
    fecharPainelOverlay({ painel: els.detalheDrawer, backdrop: els.detalheBackdrop }, 'open', 'active');
}