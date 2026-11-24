import { openModal } from '../../core/ui/index.js';
import { formatarDataCard, gerarIniciais } from './utils.js';
import { estadoAgendamento, formatarJanela } from './agendamento.js';
import {
    renderDevolucaoTabelaHeader,
    renderDevolucaoCard,
    renderAgendamentoCard,
    renderAgendamentoTabelaHeader,
    renderAgendamentoColData,
    renderAgendamentosEmptyState,
    textoLiberacaoAgendamento,
    renderDevolucaoEmptyState,
    renderDevolucaoSemResultados,
    renderDetalheItensView,
    renderDetalheItensEdit,
    renderDetalheObservacao
} from './templates.js';
import { renderOpcoesSelect } from '../../shared/components/selectOptions.js';
import { fillSelect, renderPlaceholderOption } from '../../shared/dom/fillSelect.js';
import { abrirPainelOverlay, fecharPainelOverlay } from '../../shared/dom/overlayPanel.js';
import type { LoanItemUI, LoanUI, Equipamento } from '../../types/index.js';
import { definirAgora, type FlatpickrInstance } from '../../core/ui/datepicker.js';
import { getLoansAbertos } from '../../core/state/loanStore.js';
import { getUsuario } from '../../core/state/authStore.js';
import { podeExcluirEmprestimo } from '../../core/utils/exclusaoEmprestimo.js';
import { agora } from '../../core/time/serverClock.js';
import { t } from '../../core/state/i18nStore.js';
import { renderAutoriaEmprestimo, envolverAutoria } from '../../shared/components/autoria.js';
import { limparErroCampo } from '../../shared/forms/fieldErrors.js';
import { getLoadStatus } from '../../core/state/loadStatus.js';
import { aplicarEstadoCarga, renderSkeletonLinhas } from '../../shared/components/loadState.js';

interface DevolucaoEstado {
    idPendente: string | number | null;
    idDetalheAberto: number | null;
    itensEditando: LoanItemUI[];
    itensOriginais: LoanItemUI[];
    modoEdicaoAtivo: boolean;
}

interface ListaEls {
    lista: HTMLElement;
}

interface DetalheItensEls {
    detalheItensContagem: HTMLElement;
    detalheLista: HTMLElement;
}

interface ObservacaoEls {
    detalheObs: HTMLElement;
}

interface AbrirDetalheEls extends DetalheItensEls, ObservacaoEls, ListaEls {
    detalheResp: HTMLElement;
    detalheAluno: HTMLElement;
    detalheData: HTMLElement;
    detalheEditWrap: HTMLElement;
    btnDetalheEditar: HTMLElement;
    btnDetalheSalvar: HTMLElement;
    btnConfirmarDevolucaoPainel: HTMLElement;
    btnDetalheCancelar: HTMLElement;
    detalheConteudo: HTMLElement;
    detalheEmpty: HTMLElement;
    painel: HTMLElement | null;
    backdrop: HTMLElement | null;
    /** Título e dica do detalhe (opcionais: só o modo agendamento os usa). */
    detalheTitulo?: HTMLElement | null;
    detalheAgendamentoHint?: HTMLElement | null;
    btnDetalheConfirmarRetirada?: HTMLButtonElement | null;
    btnDetalheExcluirEmprestimo?: HTMLElement | null;
}

interface SetModoEdicaoEls {
    detalheEditWrap: HTMLElement;
    btnDetalheEditar: HTMLElement;
    btnDetalheSalvar: HTMLElement;
    btnConfirmarDevolucaoPainel: HTMLElement;
    btnDetalheCancelar: HTMLElement;
    /** "Excluir empréstimo": só aparece (fora da edição) quando `data-permitido="1"`, definido ao abrir o detalhe. */
    btnDetalheExcluirEmprestimo?: HTMLElement | null;
}

interface FecharDetalheEls extends SetModoEdicaoEls, ListaEls {
    detalheConteudo: HTMLElement;
    detalheEmpty: HTMLElement;
    painel: HTMLElement | null;
    backdrop: HTMLElement | null;
}

interface PainelMobileEls {
    painel: HTMLElement | null;
    backdrop: HTMLElement | null;
}

interface ModalConfirmacaoEls {
    confirmarDevolucaoResumo: HTMLElement | null;
    devolucaoPicker: FlatpickrInstance;
    devolucaoDataInput: HTMLInputElement;
}

export type AbaDevolucao = 'andamento' | 'agendamentos';

/**
 * `consulta`: busca ativa e total antes do filtro, para distinguir "sem resultados" de "nenhum em aberto";
 * `aba` escolhe o layout (Em andamento por padrão) e `referencia` é o "agora" usado nos badges dos agendamentos.
 */
export function renderLista(
    els: ListaEls & FecharDetalheEls,
    estado: DevolucaoEstado,
    loans: LoanUI[],
    consulta?: { termo: string; totalBase: number; aba?: AbaDevolucao; referencia?: Date }
): void {
    const agendamentos = consulta?.aba === 'agendamentos';
    const referencia = consulta?.referencia ?? agora();
    if (aplicarEstadoCarga(els.lista, getLoadStatus('emprestimos').status, renderSkeletonLinhas(5))) {
        fecharDetalhe(els, estado);
        return;
    }
    if (!loans.length) {
        els.lista.innerHTML = consulta && consulta.totalBase > 0 && consulta.termo.trim()
            ? renderDevolucaoSemResultados(consulta.termo)
            : agendamentos ? renderAgendamentosEmptyState() : renderDevolucaoEmptyState();
        fecharDetalhe(els, estado);
        return;
    }

    els.lista.innerHTML = agendamentos
        ? renderAgendamentoTabelaHeader() + loans.map((loan) => renderAgendamentoCard(loan, referencia)).join('')
        : renderDevolucaoTabelaHeader() + loans.map(renderDevolucaoCard).join('');

    if (estado.idDetalheAberto) {
        const aindaExiste = loans.some((loan) => loan.id === estado.idDetalheAberto);
        aindaExiste ? marcarLinhaSelecionada(els, estado.idDetalheAberto) : fecharDetalhe(els, estado);
    }
}

/**
 * Atualiza, sem recriar os cards, o que depende da hora nos agendamentos visíveis: badge, janela, aviso de liberação
 * e o botão "Confirmar retirada" (o foco e a seleção não se perdem). Também atualiza os botões do painel de detalhes.
 */
export function atualizarTemposAgendamentos(
    els: ListaEls & { detalheAgendamentoHint?: HTMLElement | null; btnDetalheConfirmarRetirada?: HTMLButtonElement | null },
    loans: LoanUI[],
    idDetalheAberto: number | null,
    referencia: Date = agora()
): void {
    els.lista.querySelectorAll<HTMLElement>('.devolucao-item[data-agendamento]').forEach((card) => {
        const loan = loans.find((l) => String(l.id) === String(card.dataset.id));
        if (!loan) return;
        const colData = card.querySelector<HTMLElement>('.devolucao-col-data');
        if (colData) colData.innerHTML = renderAgendamentoColData(loan, referencia);
        const botao = card.querySelector<HTMLButtonElement>('.confirmar-retirada-btn');
        if (botao) botao.disabled = !estadoAgendamento(loan, referencia).podeConfirmar;
    });
    const aberto = idDetalheAberto == null ? undefined : loans.find((l) => l.id === idDetalheAberto);
    if (aberto?.status === 'agendado') atualizarAcoesDetalheAgendamento(els, aberto, referencia);
}

function atualizarAcoesDetalheAgendamento(
    els: { detalheAgendamentoHint?: HTMLElement | null; btnDetalheConfirmarRetirada?: HTMLButtonElement | null },
    loan: LoanUI,
    referencia: Date
): void {
    const estado = estadoAgendamento(loan, referencia);
    if (els.btnDetalheConfirmarRetirada) els.btnDetalheConfirmarRetirada.disabled = !estado.podeConfirmar;
    if (els.detalheAgendamentoHint) els.detalheAgendamentoHint.textContent = textoLiberacaoAgendamento(estado, referencia);
}

export function renderDetalheItens(els: DetalheItensEls, itens: LoanItemUI[], editMode: boolean, comStatus = true): void {
    els.detalheItensContagem.textContent = `(${itens.length})`;
    els.detalheLista.innerHTML = editMode ? renderDetalheItensEdit(itens) : renderDetalheItensView(itens, comStatus);
}

export function renderObservacao(els: ObservacaoEls, observacao: string | null | undefined): void {
    const conteudo = renderDetalheObservacao(observacao);
    els.detalheObs.style.display = conteudo ? 'block' : 'none';
    els.detalheObs.innerHTML = conteudo;
}

export function abrirDetalhe(els: AbrirDetalheEls, estado: DevolucaoEstado, loan: LoanUI): void {
    estado.idDetalheAberto = loan.id;
    estado.itensEditando = loan.itens.map((item) => ({ ...item }));
    estado.itensOriginais = loan.itens.map((item) => ({ ...item }));

    const agendamento = loan.status === 'agendado';
    els.painel?.classList.toggle('is-agendamento', agendamento);
    if (els.detalheTitulo) els.detalheTitulo.textContent = t(agendamento ? 'devolucao.detalhes_agendamento' : 'shell.detalhes_do_emprestimo');

    els.detalheResp.textContent = loan.responsavel;
    els.detalheAluno.textContent = loan.aluno;
    if (agendamento) {
        const estadoAg = estadoAgendamento(loan);
        els.detalheData.textContent = `${t('devolucao.agendado_para')} ${formatarJanela(estadoAg.inicio, estadoAg.fim)}`;
        atualizarAcoesDetalheAgendamento(els, loan, agora());
    } else {
        els.detalheData.textContent = t('devolucao.emprestimo_realizado_em').replace('{data}', formatarDataCard(loan.createdAt));
    }
    atualizarAutoriaDetalhe(els.detalheData, loan);

    if (els.btnDetalheExcluirEmprestimo) {
        els.btnDetalheExcluirEmprestimo.dataset.permitido = podeExcluirEmprestimo(loan, getUsuario()?.nivelAcesso, agora()) ? '1' : '0';
    }
    setModoEdicao(els, estado, false);
    renderDetalheItens(els, estado.itensEditando, false, !agendamento);
    renderObservacao(els, loan.observacao);

    mostrarDetalhe(els);
    marcarLinhaSelecionada(els, loan.id);

    if (window.matchMedia('(max-width: 1024px)').matches) abrirPainelMobile(els);
}

export function popularSelectDetalheEquipamento(select: HTMLSelectElement, equipamentos: Equipamento[]): void {
    const opcoes = equipamentos.map((eq) => ({ id: eq.id, label: `${eq.modelo} — ${eq.categoria?.nome ?? ''}` }));
    fillSelect(select, renderPlaceholderOption(t('shell.selecionar_equipamento')), renderOpcoesSelect(opcoes));
}

export function fecharDetalhe(els: FecharDetalheEls, estado: DevolucaoEstado): void {
    estado.idDetalheAberto = null;
    estado.itensEditando = [];
    estado.itensOriginais = [];
    if (els.btnDetalheExcluirEmprestimo) els.btnDetalheExcluirEmprestimo.dataset.permitido = '0';
    setModoEdicao(els, estado, false);
    els.painel?.classList.remove('is-agendamento');
    els.detalheConteudo.style.display = 'none';
    els.detalheEmpty.style.display = 'flex';
    marcarLinhaSelecionada(els, null);
    fecharPainelMobile(els);
}

export function mostrarDetalhe(els: { detalheEmpty: HTMLElement; detalheConteudo: HTMLElement }): void {
    els.detalheEmpty.style.display = 'none';
    els.detalheConteudo.style.display = 'flex';
}

export function setModoEdicao(els: SetModoEdicaoEls, estado: DevolucaoEstado, ativo: boolean): void {
    estado.modoEdicaoAtivo = ativo;
    els.detalheEditWrap.style.display = ativo ? 'block' : 'none';
    els.btnDetalheEditar.style.display = ativo ? 'none' : 'inline-flex';
    els.btnDetalheSalvar.style.display = ativo ? 'inline-flex' : 'none';
    els.btnConfirmarDevolucaoPainel.style.display = ativo ? 'none' : 'inline-flex';
    if (els.btnDetalheExcluirEmprestimo) {
        els.btnDetalheExcluirEmprestimo.style.display = !ativo && els.btnDetalheExcluirEmprestimo.dataset.permitido === '1' ? 'inline-flex' : 'none';
    }
    els.btnDetalheCancelar.textContent = ativo ? t('devolucao.cancelar_edicao') : t('shell.cancelar');
}

export function marcarLinhaSelecionada(els: ListaEls, id: number | string | null): void {
    els.lista.querySelectorAll<HTMLElement>('.devolucao-item').forEach((el) => {
        el.classList.toggle('selected', String(el.dataset.id) === String(id));
    });
}

export function abrirPainelMobile(els: PainelMobileEls): void {
    abrirPainelOverlay(els);
}

export function fecharPainelMobile(els: PainelMobileEls): void {
    fecharPainelOverlay(els);
}

function preencherResumoConfirmacao(els: ModalConfirmacaoEls, loan: LoanUI | undefined): void {
    if (!els.confirmarDevolucaoResumo || !loan) return;

    const resumo = els.confirmarDevolucaoResumo;
    const campo = (nome: string) => resumo.querySelector<HTMLElement>(`[data-summary="${nome}"]`);
    const itensLista = resumo.querySelector<HTMLElement>('[data-summary="itens-lista"] .modal-summary-items-list');

    const camposEsperados: Array<[string, string]> = [
        ['iniciais', gerarIniciais(loan.responsavel)],
        ['responsavel', loan.responsavel],
        ['aluno', loan.aluno],
        ['data', t('devolucao.retirado_em').replace('{data}', formatarDataCard(loan.createdAt))],
        ['itens', `${loan.itens.length} ${loan.itens.length === 1 ? t('devolucao.item') : t('devolucao.itens')}`]
    ];

    camposEsperados.forEach(([nome, valor]) => {
        const el = campo(nome);
        if (el) el.textContent = valor;
    });

    if (itensLista) {
        itensLista.replaceChildren();
        loan.itens.forEach((item) => {
            const chip = document.createElement('span');
            chip.className = 'modal-summary-item';

            const icon = document.createElement('span');
            icon.className = 'material-symbols-outlined';
            icon.textContent = 'inventory_2';

            const texto = document.createElement('span');
            texto.className = 'modal-summary-item-text';
            texto.textContent = `${item.quantidade}x ${item.nome}`;

            chip.append(icon, texto);
            itensLista.appendChild(chip);
        });
    }
}

export function abrirModalConfirmacao(els: ModalConfirmacaoEls, estado: DevolucaoEstado, id: string | number): void {
    estado.idPendente = id;

    const loan = getLoansAbertos().find((l) => String(l.id) === String(id));
    preencherResumoConfirmacao(els, loan);

    definirAgora(els.devolucaoPicker);
    els.devolucaoDataInput.classList.add('input-auto');
    limparErroCampo(els.devolucaoDataInput);
    openModal('modal-confirmar-devolucao');
}

/** Bloco de autoria logo abaixo da data do empréstimo; vazio para convidados (sem campos de autoria). */
function atualizarAutoriaDetalhe(ancora: HTMLElement, loan: LoanUI): void {
    ancora.parentElement?.querySelectorAll('.autoria-detalhe').forEach((el) => el.remove());
    const conteudo = envolverAutoria(renderAutoriaEmprestimo(loan), 'autoria-bloco autoria-detalhe');
    if (conteudo) ancora.insertAdjacentHTML('afterend', conteudo);
}
