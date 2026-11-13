import { showToast } from '../../core/ui/index.js';
import { getEquipamentos, subscribe as subscribeEquipamentos } from '../../core/state/equipamentoStore.js';
import {
    getHistorico,
    subscribe as subscribeLoans,
    subscribeHistorico,
    carregarMaisHistorico,
    definirFiltrosHistorico,
    limparFiltrosHistorico
} from '../../core/state/loanStore.js';
import { aoTrocarSessao } from '../../core/state/sessionChange.js';
import { isAutenticado } from '../../core/state/authStore.js';
import { subscribe as subscribeI18n } from '../../core/state/i18nStore.js';
import {
    renderEstoque,
    renderResumo,
    renderHistorico,
    ativarAbaDashboard,
    exibirDetalheEstoque,
    abrirDetalheHistorico,
    fecharDetalhe
} from './render.js';
import type { DashboardEls, DashboardEstado } from './render.js';
import type { LoanUI } from '../../types/index.js';
import { exportarEstoqueCsv, filtrarEquipamentos, filtrarHistorico, buscarEquipamentoPorId } from './service.js';
import { attachTablistKeyboard } from '../../shared/dom/tabs.js';
import { subscribe as subscribeOcorrencias } from '../../core/state/ocorrenciasStore.js';
import { subscribeLoadStatus } from '../../core/state/loadStatus.js';
import { intervaloDoPeriodo } from './filtros.js';
import type { PeriodoHistorico } from './filtros.js';
import { ligarTentarNovamente } from '../../shared/components/loadState.js';

/** Atraso da busca no servidor enquanto o usuário digita (autenticado). */
export const ATRASO_BUSCA_HISTORICO_MS = 300;

/**
 * Itens do histórico a exibir. Autenticado: a busca vai ao servidor (`q`), a lista já vem filtrada.
 * Convidado: a API não aceita `q`, então a busca filtra localmente os itens já carregados.
 */
export function historicoVisivel(termoBusca: string): LoanUI[] {
    const { items } = getHistorico();
    return isAutenticado() ? items : filtrarHistorico(items, termoBusca);
}

export function renderHistoricoAtual(els: DashboardEls, estado: DashboardEstado): void {
    renderHistorico(els, historicoVisivel(estado.termoBusca), getHistorico());
}

/** Estoque filtrado pela busca; o termo só vai ao estado vazio quando há equipamentos e a busca zerou a lista. */
export function renderEstoqueAtual(els: DashboardEls, estado: DashboardEstado): void {
    const todos = getEquipamentos();
    const filtrados = filtrarEquipamentos(todos, estado.termoBusca);
    renderEstoque(els, filtrados, todos.length ? estado.termoBusca : '');
}

export function attachDashboardEvents(els: DashboardEls, estado: DashboardEstado): void {
    let timerBusca: ReturnType<typeof setTimeout> | undefined;
    const limparCampoBusca = (): void => {
        if (timerBusca) { clearTimeout(timerBusca); timerBusca = undefined; }
        estado.termoBusca = '';
        if (els.inputBusca) els.inputBusca.value = '';
    };
    // Privacidade em PC compartilhado: a busca de quem saiu (ou do usuário anterior) não aparece para o próximo.
    aoTrocarSessao(() => {
        limparCampoBusca();
        void limparFiltrosHistorico({ recarregar: false });
        renderEstoqueAtual(els, estado);
        renderHistoricoAtual(els, estado);
    });
    const abrirDetalheEstoquePorLinha = (row: HTMLElement): void => {
        const equipamento = buscarEquipamentoPorId(row.dataset.equipamentoId ?? '', getEquipamentos());
        if (!equipamento) return;

        exibirDetalheEstoque(els, equipamento);
    };

    els.estoqueContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-limpar-busca]')) {
            limparCampoBusca();
            renderEstoqueAtual(els, estado);
            void definirFiltrosHistorico({ q: undefined });
            renderHistoricoAtual(els, estado);
            return;
        }
        const row = target.closest<HTMLElement>('.estoque-row');
        if (!row) return;

        abrirDetalheEstoquePorLinha(row);
    });

    els.estoqueContainer.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;

        const target = e.target as HTMLElement;
        const row = target.closest<HTMLElement>('.estoque-row');
        if (!row) return;

        e.preventDefault();
        abrirDetalheEstoquePorLinha(row);
    });

    if (els.btnDetalheFechar) els.btnDetalheFechar.addEventListener('click', () => fecharDetalhe(els));
    if (els.detalheBackdrop) els.detalheBackdrop.addEventListener('click', () => fecharDetalhe(els));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && els.detalheDrawer?.classList.contains('open')) fecharDetalhe(els);
    });

    if (els.inputBusca) {
        els.inputBusca.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            estado.termoBusca = target.value;

            renderEstoqueAtual(els, estado);

            if (timerBusca) clearTimeout(timerBusca);
            if (!isAutenticado()) {
                // Convidado: só guarda o termo (sem requisição) e filtra os itens carregados.
                void definirFiltrosHistorico({ q: estado.termoBusca });
                renderHistoricoAtual(els, estado);
                return;
            }
            timerBusca = setTimeout(() => {
                timerBusca = undefined;
                void definirFiltrosHistorico({ q: estado.termoBusca });
            }, ATRASO_BUSCA_HISTORICO_MS);
        });
    }

    document.querySelectorAll<HTMLElement>('.dashboard-tab-link').forEach((tabLink) => {
        tabLink.addEventListener('click', () => {
            ativarAbaDashboard(els, tabLink.dataset.tab ?? '');
            fecharDetalhe(els);
        });
    });

    const dashboardTablist = document.querySelector<HTMLElement>('.dashboard-tablist');
    if (dashboardTablist) attachTablistKeyboard(dashboardTablist, '.dashboard-tab-link');

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

    if (els.historicoFiltros) {
        els.historicoFiltros.addEventListener('click', (e) => {
            const alvo = (e.target as HTMLElement).closest<HTMLElement>('button');
            if (!alvo || !els.historicoFiltros?.contains(alvo)) return;
            if (alvo.hasAttribute('data-filtro-limpar')) {
                limparCampoBusca();
                renderEstoqueAtual(els, estado);
                void limparFiltrosHistorico();
                renderHistoricoAtual(els, estado);
                return;
            }
            const valor = alvo.dataset.filtroValor ?? '';
            if (alvo.dataset.filtroGrupo === 'status') {
                void definirFiltrosHistorico({ status: valor === 'ABERTO' || valor === 'DEVOLVIDO' ? valor : undefined });
            } else if (alvo.dataset.filtroGrupo === 'periodo') {
                void definirFiltrosHistorico(intervaloDoPeriodo(valor as PeriodoHistorico));
            }
            renderHistoricoAtual(els, estado);
        });
    }

    els.historicoVazio.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('[data-limpar-busca]')) return;
        limparCampoBusca();
        renderEstoqueAtual(els, estado);
        void limparFiltrosHistorico();
        renderHistoricoAtual(els, estado);
    });

    els.historicoLista.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btn = target.closest<HTMLElement>('.historico-detalhes-btn');
        if (!btn) return;
        const loan = getHistorico().items.find((l) => String(l.id) === String(btn.dataset.id));
        if (loan) abrirDetalheHistorico(els, loan);
    });

    subscribeEquipamentos(() => {
        const equipamentos = getEquipamentos();
        renderEstoqueAtual(els, estado);
        renderResumo(els, equipamentos);
    });

    if (els.btnCarregarMais) {
        els.btnCarregarMais.addEventListener('click', async () => {
            await carregarMaisHistorico();
            const { erro } = getHistorico();
            if (erro) showToast(erro, 'error');
        });
    }

    subscribeHistorico(() => renderHistoricoAtual(els, estado));
    // "Mostrando N empréstimos" / "Carregar mais" são montados com t(): refaz ao trocar o idioma.
    subscribeI18n(() => renderHistoricoAtual(els, estado));

    // Empréstimos abertos alimentam o total "Emprestados" do resumo.
    subscribeLoans(() => renderResumo(els, getEquipamentos()));

    subscribeOcorrencias(() => {
        renderResumo(els, getEquipamentos());
    });

    // Troca de estado da carga inicial (esqueleto / erro / pronto); atualizações em segundo plano não passam por aqui.
    subscribeLoadStatus((chave) => {
        if (chave === 'equipamentos') {
            renderEstoqueAtual(els, estado);
            renderResumo(els, getEquipamentos());
        } else if (chave === 'emprestimos') {
            renderHistoricoAtual(els, estado);
        }
    });
    ligarTentarNovamente(els.estoqueContainer, 'equipamentos');
    ligarTentarNovamente(els.historicoLista, 'emprestimos');
}
