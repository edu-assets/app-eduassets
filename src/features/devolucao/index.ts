import { getEquipamentos, subscribe as subscribeEquipamentos } from '../../core/state/equipamentoStore.js';
import { criarDataAutoPicker } from '../../core/ui/index.js';
import { renderLista, popularSelectDetalheEquipamento, atualizarTemposAgendamentos } from './render.js';
import type { AbaDevolucao } from './render.js';
import { attachDevolucaoEvents } from './events.js';
import { getLoansAbertos, getAgendamentos, subscribe } from '../../core/state/loanStore.js';
import { agora } from '../../core/time/serverClock.js';
import { attachTablistKeyboard, sincronizarAbasAria } from '../../shared/dom/tabs.js';
import { t } from '../../core/state/i18nStore.js';
import { aoTrocarSessao } from '../../core/state/sessionChange.js';
import { subscribe as subscribeI18n } from '../../core/state/i18nStore.js';
import { subscribeLoadStatus } from '../../core/state/loadStatus.js';
import { ligarTentarNovamente } from '../../shared/components/loadState.js';
import { criarFiltroDevolucoes, filtrarOrdenarDevolucoes, filtrarOrdenarAgendamentos, montarFerramentasDevolucoes } from './filtro.js';
import type { LoanItemUI } from '../../types/index.js';

/** Reavalia badges e botões dos agendamentos conforme o relógio avança. */
export const INTERVALO_ATUALIZACAO_AGENDAMENTOS_MS = 30_000;

export async function initDevolucao(): Promise<void> {
    const lista = document.getElementById('lista-devolucoes-items');
    if (!lista) return;

    const devolucaoDataInput = document.getElementById('modal-devolucao-data') as HTMLInputElement;
    const detalheEquipamentoSelect = document.getElementById('detalhe-equipamento') as HTMLSelectElement;

    const els = {
        lista: lista as HTMLElement,
        devolucaoDataInput,
        confirmarDevolucaoResumo: document.getElementById('modal-confirmar-devolucao-resumo'),
        btnCancelarDevolucao: document.getElementById('modal-confirmar-devolucao-cancelar'),
        btnConfirmarDevolucao: document.getElementById('btn-confirmar-devolucao') as HTMLButtonElement,
        detalheEmpty: document.getElementById('devolucao-detalhe-empty') as HTMLElement,
        detalheConteudo: document.getElementById('devolucao-detalhe-conteudo') as HTMLElement,
        detalhePapelIcon: document.getElementById('detalhe-papel-icon'),
        detalheResp: document.getElementById('detalhe-emprestimo-resp') as HTMLElement,
        detalheAluno: document.getElementById('detalhe-emprestimo-aluno') as HTMLElement,
        detalheData: document.getElementById('detalhe-emprestimo-data') as HTMLElement,
        detalheObs: document.getElementById('detalhe-emprestimo-obs') as HTMLElement,
        detalheLista: document.getElementById('detalhe-emprestimo-lista') as HTMLElement,
        detalheItensContagem: document.getElementById('detalhe-itens-contagem') as HTMLElement,
        detalheEditWrap: document.getElementById('detalhe-emprestimo-edit') as HTMLElement,
        detalheEquipamentoSelect,
        detalheQuantidadeInput: document.getElementById('detalhe-quantidade') as HTMLInputElement,
        btnDetalheAdicionarItem: document.getElementById('btn-detalhe-adicionar-item') as HTMLButtonElement,
        btnDetalheEditar: document.getElementById('btn-detalhe-editar') as HTMLElement,
        btnDetalheSalvar: document.getElementById('btn-detalhe-salvar') as HTMLButtonElement,
        btnDetalheFechar: document.getElementById('btn-detalhe-fechar') as HTMLElement,
        btnDetalheCancelar: document.getElementById('btn-detalhe-cancelar') as HTMLElement,
        btnConfirmarDevolucaoPainel: document.getElementById('btn-confirmar-devolucao-painel') as HTMLElement,
        btnDetalheConfirmarRetirada: document.getElementById('btn-detalhe-confirmar-retirada') as HTMLButtonElement | null,
        btnDetalheExcluirAgendamento: document.getElementById('btn-detalhe-excluir-agendamento') as HTMLElement | null,
        detalheTitulo: document.getElementById('devolucao-detalhe-titulo'),
        detalheAgendamentoHint: document.getElementById('detalhe-agendamento-hint'),
        painel: document.querySelector('.devolucao-detalhe-painel') as HTMLElement | null,
        backdrop: document.getElementById('devolucao-detalhe-backdrop'),
        devolucaoPicker: await criarDataAutoPicker(devolucaoDataInput)
    };

    popularSelectDetalheEquipamento(els.detalheEquipamentoSelect, getEquipamentos());

    const estado: {
        idPendente: string | number | null;
        idDetalheAberto: number | null;
        itensEditando: LoanItemUI[];
        itensOriginais: LoanItemUI[];
        modoEdicaoAtivo: boolean;
    } = {
        idPendente: null,
        idDetalheAberto: null,
        itensEditando: [],
        itensOriginais: [],
        modoEdicaoAtivo: false
    };

    attachDevolucaoEvents(els, estado);

    const filtro = criarFiltroDevolucoes();
    // A aba não é lembrada entre sessões: cada abertura do app começa em "Em andamento".
    let abaAtual: AbaDevolucao = 'andamento';
    let timer: number | null = null;

    const abas = Array.from(document.querySelectorAll<HTMLElement>('#devolucao-abas [role="tab"]'));
    const pararTimer = (): void => {
        if (timer !== null) { window.clearInterval(timer); timer = null; }
    };
    const tick = (): void => {
        if (abaAtual !== 'agendamentos') return;
        atualizarTemposAgendamentos(els, getAgendamentos(), estado.idDetalheAberto, agora());
    };
    /** O timer só existe enquanto há agendamentos na tela (aba aberta e lista não vazia). */
    const sincronizarTimer = (): void => {
        const precisa = abaAtual === 'agendamentos' && getAgendamentos().length > 0;
        if (precisa && timer === null) timer = window.setInterval(tick, INTERVALO_ATUALIZACAO_AGENDAMENTOS_MS);
        else if (!precisa) pararTimer();
    };
    const atualizarAbas = (): void => {
        const abertos = getLoansAbertos().length;
        const agendados = getAgendamentos().length;
        abas.forEach((aba) => {
            const ativa = aba.dataset.tab === abaAtual;
            aba.classList.toggle('active', ativa);
            aba.textContent = aba.dataset.tab === 'agendamentos'
                ? t('devolucao.aba_agendamentos_n').replace('{n}', String(agendados))
                : t('devolucao.aba_em_andamento_n').replace('{n}', String(abertos));
        });
        sincronizarAbasAria(abas);
        els.lista.setAttribute('role', 'tabpanel');
        els.lista.setAttribute('aria-labelledby', abas.find((aba) => aba.classList.contains('active'))?.id ?? '');
    };

    const renderAtual = (): void => {
        const agendamentos = abaAtual === 'agendamentos';
        const base = agendamentos ? getAgendamentos() : getLoansAbertos();
        const filtrados = agendamentos ? filtrarOrdenarAgendamentos(base, filtro) : filtrarOrdenarDevolucoes(base, filtro);
        renderLista(els, estado, filtrados, { termo: filtro.termo, totalBase: base.length, aba: abaAtual, referencia: agora() });
        atualizarAbas();
        sincronizarTimer();
    };
    const ferramentas = montarFerramentasDevolucoes(els.lista, filtro, renderAtual);

    const tablist = document.getElementById('devolucao-abas');
    abas.forEach((aba) => aba.addEventListener('click', () => {
        const nova: AbaDevolucao = aba.dataset.tab === 'agendamentos' ? 'agendamentos' : 'andamento';
        if (nova === abaAtual) return;
        abaAtual = nova;
        renderAtual();
    }));
    if (tablist) attachTablistKeyboard(tablist, '[role="tab"]');

    renderAtual();
    aoTrocarSessao(() => {
        filtro.termo = '';
        abaAtual = 'andamento';
        pararTimer();
        const campo = document.getElementById('devolucao-busca') as HTMLInputElement | null;
        if (campo) campo.value = '';
        renderAtual();
    });
    subscribe(renderAtual);
    subscribeLoadStatus((chave) => { if (chave === 'emprestimos') renderAtual(); });
    ligarTentarNovamente(els.lista, 'emprestimos');
    subscribeEquipamentos((equipamentos) => popularSelectDetalheEquipamento(els.detalheEquipamentoSelect, equipamentos));
    subscribeI18n(() => { ferramentas.atualizarRotulos(); renderAtual(); });
}
