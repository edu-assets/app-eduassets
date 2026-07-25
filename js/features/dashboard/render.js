import { openModal } from '../../core/ui/index.js';
import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { calcularResumo, calcularEmprestado, buscarEquipamentoPorId } from './service.js';
import {
    renderDashboardCategoriaForm,
    renderDashboardEstoqueContent,
    renderDashboardAndamentoContent,
    renderDashboardHistoricoContent,
    renderDashboardHistoricoDetalheBody
} from './templates.js';

const LIMITE_CHIPS_HISTORICO = 2;

export function renderEstoque(els, equipamentos) {
    els.estoqueContainer.innerHTML = renderDashboardEstoqueContent(equipamentos);
}

export function renderResumo(els, equipamentos) {
    const resumo = calcularResumo(equipamentos);

    els.resumoTotal.textContent = resumo.total;
    els.resumoDisponivel.textContent = resumo.disponivel;
    els.resumoEmprestado.textContent = resumo.emprestado;
    els.resumoQuebrado.textContent = resumo.quebrado;

    els.resumoDisponivelPct.textContent = `${resumo.disponivelPct} do total`;
    els.resumoEmprestadoPct.textContent = `${resumo.emprestadoPct} do total`;
    els.resumoQuebradoPct.textContent = `${resumo.quebradoPct} do total`;
}

export function renderAndamento(els, loans) {
    if (!loans.length) {
        els.andamentoLista.innerHTML = '';
        els.andamentoVazio.style.display = 'flex';
        return;
    }

    els.andamentoVazio.style.display = 'none';
    els.andamentoLista.innerHTML = renderDashboardAndamentoContent(loans);
}

export function renderHistorico(els, loans) {
    if (!loans.length) {
        els.historicoLista.innerHTML = '';
        els.historicoVazio.style.display = 'flex';
        return;
    }

    els.historicoVazio.style.display = 'none';
    els.historicoLista.innerHTML = renderDashboardHistoricoContent(loans, LIMITE_CHIPS_HISTORICO);
}

export function ativarAbaDashboard(els, tab) {
    document.querySelectorAll('.dashboard-tab-link').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.dashboard-tab-content').forEach((c) => c.classList.remove('active'));

    const tabLink = document.querySelector(`.dashboard-tab-link[data-tab="${tab}"]`);
    const targetTab = document.getElementById(`tab-${tab}`);

    if (tabLink) tabLink.classList.add('active');
    if (targetTab) targetTab.classList.add('active');
}

export function fecharTodosMenusEstoque(els) {
    els.estoqueContainer.querySelectorAll('.registros-row-menu.active').forEach((menu) => menu.classList.remove('active'));
}

export function atualizarVisibilidadeDetalhe(els, ehLayoutEmpilhadoAtual) {
    if (!els.detalheContainer) return;
    const abaAtiva = document.querySelector('.dashboard-tab-link.active')?.dataset.tab;
    els.detalheContainer.style.display = (abaAtiva === 'estoque' && !ehLayoutEmpilhadoAtual) ? 'flex' : 'none';
}

function montarDadosFormularioCategoria(equipamento) {
    return {
        id: equipamento.id,
        categoria: equipamento.categoria?.nome ?? '',
        total: equipamento.quantidadeTotal,
        disponivel: equipamento.quantidadeDisponivel,
        quebrado: equipamento.quantidadeQuebrada,
        emprestado: calcularEmprestado(equipamento)
    };
}

export function abrirDetalheEstoque(els, estado, equipamentoId, ehLayoutEmpilhadoAtual) {
    const equipamento = buscarEquipamentoPorId(equipamentoId, getEquipamentos());
    if (!equipamento) return;

    if (ehLayoutEmpilhadoAtual) {
        abrirModalCategoria(els, estado, equipamento);
        return;
    }

    const dadosFormulario = montarDadosFormularioCategoria(equipamento);

    els.detalheTitulo.textContent = 'Editar categoria';
    els.detalheBody.innerHTML = renderDashboardCategoriaForm(dadosFormulario) + `
        <div class="category-edit-actions">
            <button type="button" class="btn btn-neutral" id="btn-detalhe-estoque-cancelar">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btn-detalhe-estoque-salvar-novo">
                <span class="material-symbols-outlined">save</span> Salvar alterações
            </button>
        </div>
    `;

    estado.equipamentoIdPainelAtual = equipamento.id;
    mostrarDetalhe(els);
}

export function abrirModalCategoria(els, estado, equipamento) {
    estado.equipamentoIdModalAtual = equipamento.id;
    els.modalCategoriaBody.innerHTML = renderDashboardCategoriaForm(montarDadosFormularioCategoria(equipamento));
    openModal('modal-dashboard-categoria');
}

export function abrirDetalheHistorico(els, loan) {
    els.detalheTitulo.textContent = `Empréstimo #${loan.numero}`;
    els.detalheBody.innerHTML = renderDashboardHistoricoDetalheBody(loan);
    mostrarDetalhe(els);
}

export function mostrarDetalhe(els) {
    if (els.detalheEmpty) els.detalheEmpty.style.display = 'none';
    els.detalheConteudo.style.display = 'block';
}

export function fecharDetalhe(els) {
    els.detalheConteudo.style.display = 'none';
    if (els.detalheEmpty) els.detalheEmpty.style.display = 'flex';
}