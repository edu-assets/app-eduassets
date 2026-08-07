import { openModal } from '../../core/ui/index.js';
import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { calcularResumo, calcularEmprestado, calcularManutencao, buscarEquipamentoPorId } from './service.js';
import {
    renderDashboardCategoriaForm,
    renderDashboardEstoqueContent,
    renderDashboardAndamentoContent,
    renderDashboardHistoricoContent,
    renderDashboardHistoricoDetalheBody
} from './templates.js';
import type { Equipamento, LoanUI, CategoriaResumoDados } from '../../types/index.js';

const LIMITE_CHIPS_HISTORICO = 2;

export interface DashboardEls {
    estoqueContainer: HTMLElement;
    btnExportar: HTMLElement | null;
    andamentoLista: HTMLElement;
    andamentoVazio: HTMLElement;
    detalheConteudo: HTMLElement;
    detalheTitulo: HTMLElement;
    detalheBody: HTMLElement;
    btnDetalheFechar: HTMLElement | null;
    detalheContainer: HTMLElement | null;
    detalheEmpty: HTMLElement | null;
    historicoLista: HTMLElement;
    historicoVazio: HTMLElement;
    modalCategoriaBody: HTMLElement;
    btnModalCategoriaFechar: HTMLElement | null;
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
    equipamentoIdModalAtual: number | null;
    equipamentoIdPainelAtual: number | null;
    termoBusca: string;
}

export function renderEstoque(els: DashboardEls, equipamentos: Equipamento[]): void {
    els.estoqueContainer.innerHTML = renderDashboardEstoqueContent(equipamentos);
}

export function renderResumo(els: DashboardEls, equipamentos: Equipamento[]): void {
    const resumo = calcularResumo(equipamentos);

    els.resumoTotal.textContent = String(resumo.total);
    els.resumoDisponivel.textContent = String(resumo.disponivel);
    els.resumoEmprestado.textContent = String(resumo.emprestado);
    els.resumoQuebrado.textContent = String(resumo.quebrado);
    els.resumoManutencao.textContent = String(resumo.manutencao);

    els.resumoDisponivelPct.textContent = `${resumo.disponivelPct} do total`;
    els.resumoEmprestadoPct.textContent = `${resumo.emprestadoPct} do total`;
    els.resumoQuebradoPct.textContent = `${resumo.quebradoPct} do total`;
    els.resumoManutencaoPct.textContent = `${resumo.manutencaoPct} do total`;
}

export function renderAndamento(els: DashboardEls, loans: LoanUI[]): void {
    if (!loans.length) {
        els.andamentoLista.innerHTML = '';
        els.andamentoVazio.style.display = 'flex';
        return;
    }

    els.andamentoVazio.style.display = 'none';
    els.andamentoLista.innerHTML = renderDashboardAndamentoContent(loans);
}

export function renderHistorico(els: DashboardEls, loans: LoanUI[]): void {
    if (!loans.length) {
        els.historicoLista.innerHTML = '';
        els.historicoVazio.style.display = 'flex';
        return;
    }

    els.historicoVazio.style.display = 'none';
    els.historicoLista.innerHTML = renderDashboardHistoricoContent(loans, LIMITE_CHIPS_HISTORICO);
}

export function ativarAbaDashboard(els: DashboardEls, tab: string): void {
    document.querySelectorAll('.dashboard-tab-link').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.dashboard-tab-content').forEach((c) => c.classList.remove('active'));

    const tabLink = document.querySelector(`.dashboard-tab-link[data-tab="${tab}"]`);
    const targetTab = document.getElementById(`tab-${tab}`);

    if (tabLink) tabLink.classList.add('active');
    if (targetTab) targetTab.classList.add('active');
}

export function atualizarVisibilidadeDetalhe(els: DashboardEls, ehLayoutEmpilhadoAtual: boolean): void {
    if (!els.detalheContainer) return;
    const abaAtiva = document.querySelector<HTMLElement>('.dashboard-tab-link.active')?.dataset.tab;
    const deveExibir = (abaAtiva === 'estoque' || abaAtiva === 'historico') && !ehLayoutEmpilhadoAtual;

    els.detalheContainer.style.display = deveExibir ? 'flex' : 'none';

    if (!deveExibir) {
        fecharDetalhe(els);
    }
}

function montarDadosFormularioCategoria(equipamento: Equipamento): CategoriaResumoDados {
    return {
        id: equipamento.id,
        categoria: equipamento.categoria?.nome ?? '',
        total: equipamento.quantidadeTotal,
        disponivel: equipamento.quantidadeDisponivel,
        emprestado: calcularEmprestado(equipamento),
        manutencao: calcularManutencao(equipamento),
        quebrado: equipamento.quantidadeQuebrada
    };
}

export function abrirDetalheEstoque(
    els: DashboardEls,
    estado: DashboardEstado,
    equipamentoId: string | number,
    ehLayoutEmpilhadoAtual: boolean
): void {
    const equipamento = buscarEquipamentoPorId(equipamentoId, getEquipamentos());
    if (!equipamento) return;

    if (ehLayoutEmpilhadoAtual) {
        abrirModalCategoria(els, estado, equipamento);
        return;
    }

    const dadosFormulario = montarDadosFormularioCategoria(equipamento);

    els.detalheTitulo.textContent = 'Detalhes da categoria';
    els.detalheBody.innerHTML = renderDashboardCategoriaForm(dadosFormulario) + `
        <div class="category-edit-actions">
            <button type="button" class="btn btn-neutral" id="btn-detalhe-estoque-fechar">Fechar</button>
        </div>
    `;

    estado.equipamentoIdPainelAtual = equipamento.id;
    mostrarDetalhe(els);
}

export function abrirModalCategoria(els: DashboardEls, estado: DashboardEstado, equipamento: Equipamento): void {
    estado.equipamentoIdModalAtual = equipamento.id;
    const painel = els.detalheConteudo.closest<HTMLElement>('.devolucao-detalhe-painel');
    if (painel) painel.classList.remove('dashboard-detalhe-overlay-open');
    els.modalCategoriaBody.innerHTML = renderDashboardCategoriaForm(montarDadosFormularioCategoria(equipamento));
    openModal('modal-dashboard-categoria');
}

export function abrirDetalheHistorico(els: DashboardEls, loan: LoanUI): void {
    els.detalheTitulo.textContent = `Empréstimo #${loan.numero}`;
    els.detalheBody.innerHTML = renderDashboardHistoricoDetalheBody(loan);
    mostrarDetalhe(els);
}

export function mostrarDetalhe(els: DashboardEls): void {
    if (els.detalheEmpty) els.detalheEmpty.style.display = 'none';
    els.detalheConteudo.style.display = 'block';

    const painel = els.detalheConteudo.closest<HTMLElement>('.devolucao-detalhe-painel');
    if (painel && els.detalheBody.innerHTML.trim()) {
        painel.classList.add('dashboard-detalhe-overlay-open');
    }

    if (els.detalheContainer) els.detalheContainer.style.display = 'flex';
}

export function fecharDetalhe(els: DashboardEls): void {
    els.detalheConteudo.style.display = 'none';
    if (els.detalheEmpty) els.detalheEmpty.style.display = 'flex';

    const painel = els.detalheConteudo.closest<HTMLElement>('.devolucao-detalhe-painel');
    if (painel) painel.classList.remove('dashboard-detalhe-overlay-open');
}