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
import { getFiltrosHistorico } from '../../core/state/loanStore.js';
import type { HistoricoEstado } from '../../core/state/loanStore.js';
import { renderBarraFiltros, haFiltrosAtivos } from './filtros.js';
import { renderEmptyStateSemResultados } from '../../shared/components/emptyState.js';
import { html } from '../../core/utils/html.js';

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
    historicoFiltros?: HTMLElement | null;
    historicoPaginacao?: HTMLElement | null;
    historicoContagem?: HTMLElement | null;
    btnCarregarMais?: HTMLButtonElement | null;
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

export function renderEstoque(els: DashboardEls, equipamentos: Equipamento[], termoBusca = ''): void {
    if (aplicarEstadoCarga(els.estoqueContainer, getLoadStatus('equipamentos').status, renderSkeletonLinhas(6))) return;
    els.estoqueContainer.innerHTML = renderDashboardEstoqueContent(equipamentos, termoBusca);
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

/** Texto "Mostrando N empréstimos" (já traduzido). */
export function textoContagemHistorico(quantidade: number): string {
    return quantidade === 1
        ? t('dashboard.historico_mostrando_um')
        : t('dashboard.historico_mostrando').replace('{n}', String(quantidade));
}

/**
 * Lista do histórico. `historico` (estado paginado do store) controla o esqueleto da troca de filtros, o erro sem
 * itens, a contagem e o botão "Carregar mais"; `loans` é o que aparece (já filtrado localmente, para convidados).
 */
export function renderHistorico(els: DashboardEls, loans: LoanUI[], historico?: HistoricoEstado): void {
    const filtros = getFiltrosHistorico();
    if (els.historicoFiltros) renderBarraFiltros(els.historicoFiltros, filtros);
    const estadoCarga = getLoadStatus('emprestimos').status;
    const semItens = !historico || historico.items.length === 0;
    const estado = estadoCarga !== 'pronto' || !historico || !semItens
        ? estadoCarga
        : historico.carregando ? 'carregando' : historico.erro ? 'erro' : estadoCarga;
    if (aplicarEstadoCarga(els.historicoLista, estado, renderSkeletonLinhas(5))) {
        els.historicoVazio.style.display = 'none';
        renderPaginacaoHistorico(els, 0, null);
        return;
    }
    renderPaginacaoHistorico(els, loans.length, historico ?? null);
    if (!loans.length) {
        els.historicoLista.innerHTML = '';
        els.historicoVazio.innerHTML = haFiltrosAtivos(filtros)
            ? renderEmptyStateSemResultados({
                consulta: filtros.q ?? '',
                limpar: 'filtros',
                containerClass: 'estado-vazio-resultados'
            })
            : html`<span class="material-symbols-outlined">history</span><p>${t('shell.nenhum_emprestimo_registrado_ainda')}</p>`;
        els.historicoVazio.style.display = 'flex';
        return;
    }

    els.historicoVazio.style.display = 'none';
    els.historicoLista.innerHTML = renderDashboardHistoricoContent(loans, LIMITE_CHIPS_HISTORICO);
}

function renderPaginacaoHistorico(els: DashboardEls, visiveis: number, historico: HistoricoEstado | null): void {
    if (!els.historicoPaginacao) return;
    const temMais = Boolean(historico && historico.nextCursor !== null);
    const mostrar = Boolean(historico) && (visiveis > 0 || temMais);
    els.historicoPaginacao.hidden = !mostrar;
    if (!mostrar || !historico) return;
    if (els.historicoContagem) els.historicoContagem.textContent = textoContagemHistorico(visiveis);
    if (els.btnCarregarMais) {
        els.btnCarregarMais.hidden = !temMais;
        els.btnCarregarMais.disabled = historico.carregando;
        els.btnCarregarMais.textContent = t('dashboard.historico_carregar_mais');
        if (historico.carregando) els.btnCarregarMais.setAttribute('aria-busy', 'true');
        else els.btnCarregarMais.removeAttribute('aria-busy');
    }
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
    els.detalheTitulo.textContent = `${t('devolucao.emprestimo')} #${loan.numero}`;
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