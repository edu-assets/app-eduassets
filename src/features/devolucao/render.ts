import { openModal } from '../../core/ui/index.js';
import { formatarDataCard, gerarIniciais } from './utils.js';
import {
    renderDevolucaoTabelaHeader,
    renderDevolucaoCard,
    renderDevolucaoEmptyState,
    renderDetalheItensView,
    renderDetalheItensEdit,
    renderDetalheObservacao
} from './templates.js';
import { renderOpcoesSelect } from '../../shared/components/selectOptions.js';
import { fillSelect, renderPlaceholderOption } from '../../shared/dom/fillSelect.js';
import { abrirPainelOverlay, fecharPainelOverlay } from '../../shared/dom/overlayPanel.js';
import type { LoanItemUI, LoanUI, Equipamento } from '../../types/index.js';
import type { FlatpickrInstance } from '../../core/ui/datepicker.js';
import { getLoansAbertos } from '../../core/state/loanStore.js';
import { t } from '../../core/state/i18nStore.js';

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
}

interface SetModoEdicaoEls {
    detalheEditWrap: HTMLElement;
    btnDetalheEditar: HTMLElement;
    btnDetalheSalvar: HTMLElement;
    btnConfirmarDevolucaoPainel: HTMLElement;
    btnDetalheCancelar: HTMLElement;
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

export function renderLista(els: ListaEls & FecharDetalheEls, estado: DevolucaoEstado, loans: LoanUI[]): void {
    if (!loans.length) {
        els.lista.innerHTML = renderDevolucaoEmptyState();
        fecharDetalhe(els, estado);
        return;
    }

    els.lista.innerHTML = renderDevolucaoTabelaHeader() + loans.map(renderDevolucaoCard).join('');

    if (estado.idDetalheAberto) {
        const aindaExiste = loans.some((loan) => loan.id === estado.idDetalheAberto);
        aindaExiste ? marcarLinhaSelecionada(els, estado.idDetalheAberto) : fecharDetalhe(els, estado);
    }
}

export function renderDetalheItens(els: DetalheItensEls, itens: LoanItemUI[], editMode: boolean): void {
    els.detalheItensContagem.textContent = `(${itens.length})`;
    els.detalheLista.innerHTML = editMode ? renderDetalheItensEdit(itens) : renderDetalheItensView(itens);
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

    els.detalheResp.textContent = loan.responsavel;
    els.detalheAluno.textContent = loan.aluno;
    els.detalheData.textContent = t('devolucao.emprestimo_realizado_em').replace('{data}', formatarDataCard(loan.createdAt));

    setModoEdicao(els, estado, false);
    renderDetalheItens(els, estado.itensEditando, false);
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
    setModoEdicao(els, estado, false);
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

    els.devolucaoPicker.setDate(new Date(), false);
    els.devolucaoDataInput.classList.add('input-auto');
    openModal('modal-confirmar-devolucao');
}
