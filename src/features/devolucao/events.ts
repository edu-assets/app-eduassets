import { showToast, closeModal } from '../../core/ui/index.js';
import { getLoansAbertos } from '../../core/state/loanStore.js';
import { ehLayoutEmpilhado } from '../../core/utils/viewport.js';
import { LAYOUT_EMPILHADO_BREAKPOINT } from '../../core/constants/breakpoints.js';
import { formatarErroEstoque } from '../../core/utils/erroEstoque.js';
import { traduzirErro, t } from '../../core/state/i18nStore.js';
import {
    renderDetalheItens,
    abrirDetalhe,
    fecharDetalhe,
    setModoEdicao,
    abrirModalConfirmacao,
    fecharPainelMobile
} from './render.js';
import {
    removerItemPorId,
    adicionarItemDetalheComValidacao,
    atualizarQuantidadeComValidacao,
    confirmarDevolucao,
    salvarItensEmprestimo
} from './service.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';
import type { LoanItemUI } from '../../types/index.js';
import type { FlatpickrInstance } from '../../core/ui/datepicker.js';
import { setButtonLoading } from '../../shared/dom/buttonLoading.js';

interface DevolucaoEstado {
    idPendente: string | number | null;
    idDetalheAberto: number | null;
    itensEditando: LoanItemUI[];
    itensOriginais: LoanItemUI[];
    modoEdicaoAtivo: boolean;
}

interface DevolucaoEls {
    lista: HTMLElement;
    devolucaoDataInput: HTMLInputElement;
    confirmarDevolucaoResumo: HTMLElement | null;
    btnCancelarDevolucao: HTMLElement | null;
    btnConfirmarDevolucao: HTMLButtonElement;
    detalheEmpty: HTMLElement;
    detalheConteudo: HTMLElement;
    detalheResp: HTMLElement;
    detalheAluno: HTMLElement;
    detalheData: HTMLElement;
    detalheObs: HTMLElement;
    detalheLista: HTMLElement;
    detalheItensContagem: HTMLElement;
    detalheEditWrap: HTMLElement;
    detalheEquipamentoSelect: HTMLSelectElement;
    detalheQuantidadeInput: HTMLInputElement;
    btnDetalheAdicionarItem: HTMLButtonElement;
    btnDetalheEditar: HTMLElement;
    btnDetalheSalvar: HTMLButtonElement;
    btnDetalheFechar: HTMLElement;
    btnDetalheCancelar: HTMLElement;
    btnConfirmarDevolucaoPainel: HTMLElement;
    painel: HTMLElement | null;
    backdrop: HTMLElement | null;
    devolucaoPicker: FlatpickrInstance;
}

export function attachDevolucaoEvents(els: DevolucaoEls, estado: DevolucaoEstado): void {
    els.lista.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        const btnDevolver = target.closest<HTMLElement>('.devolver-btn');
        if (btnDevolver) {
            if (bloquearSeConvidado()) return;
            abrirModalConfirmacao(els, estado, btnDevolver.dataset.id ?? '');
            return;
        }

        const card = target.closest<HTMLElement>('.devolucao-item');
        if (!card) return;

        const loan = getLoansAbertos().find((l) => String(l.id) === String(card.dataset.id));
        if (loan) abrirDetalhe(els, estado, loan);
    });

    if (els.btnCancelarDevolucao) {
        els.btnCancelarDevolucao.addEventListener('click', () => {
            estado.idPendente = null;
            closeModal('modal-confirmar-devolucao');
        });
    }

    els.btnConfirmarDevolucao.addEventListener('click', async () => {
        if (bloquearSeConvidado()) return;
        if (!estado.idPendente) return;

        setButtonLoading(els.btnConfirmarDevolucao, true);
        try {
            await confirmarDevolucao(Number(estado.idPendente));
            showToast(t('feedback.devolucao_registrada').replace('{data}', els.devolucaoDataInput.value), 'success');
            closeModal('modal-confirmar-devolucao');
            estado.idPendente = null;
        } catch (erro) {
            showToast(traduzirErro(erro, 'feedback.erro_registrar_devolucao'), 'error');
        } finally {
            setButtonLoading(els.btnConfirmarDevolucao, false);
        }
    });

    els.btnConfirmarDevolucaoPainel.addEventListener('click', () => {
        if (!estado.idDetalheAberto) return;
        abrirModalConfirmacao(els, estado, estado.idDetalheAberto);
    });

    els.btnDetalheFechar.addEventListener('click', () => fecharDetalhe(els, estado));
    if (els.backdrop) els.backdrop.addEventListener('click', () => fecharDetalhe(els, estado));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && els.painel?.classList.contains('mobile-aberto')) {
            fecharDetalhe(els, estado);
        }
    });

    window.addEventListener('resize', () => {
        if (!ehLayoutEmpilhado(LAYOUT_EMPILHADO_BREAKPOINT)) fecharPainelMobile(els);
    });

    els.btnDetalheCancelar.addEventListener('click', () => {
        if (estado.modoEdicaoAtivo) {
            const loan = getLoansAbertos().find((l) => l.id === estado.idDetalheAberto);
            estado.itensEditando = loan ? loan.itens.map((item) => ({ ...item })) : [];
            setModoEdicao(els, estado, false);
            renderDetalheItens(els, estado.itensEditando, false);
            return;
        }
        fecharDetalhe(els, estado);
    });

    els.btnDetalheEditar.addEventListener('click', () => {
        if (bloquearSeConvidado()) return;
        setModoEdicao(els, estado, true);
        renderDetalheItens(els, estado.itensEditando, true);
    });

    els.btnDetalheAdicionarItem.addEventListener('click', () => {
        if (!els.detalheEquipamentoSelect.value) {
            els.detalheEquipamentoSelect.reportValidity();
            return;
        }

        const equipamentoId = els.detalheEquipamentoSelect.value;
        const quantidade = Number(els.detalheQuantidadeInput.value) || 1;
        const nome = els.detalheEquipamentoSelect.options[els.detalheEquipamentoSelect.selectedIndex].text;

        const resultado = adicionarItemDetalheComValidacao(
            estado.itensEditando,
            estado.itensOriginais,
            { id: equipamentoId, nome, quantidade }
        );

        if (!resultado.ok) {
            showToast(resultado.erro ?? t('feedback.estoque_insuficiente'), 'warning');
            return;
        }

        estado.itensEditando = resultado.itens;
        renderDetalheItens(els, estado.itensEditando, true);
        els.detalheEquipamentoSelect.value = '';
        els.detalheQuantidadeInput.value = '1';
    });

    els.detalheLista.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btnRemover = target.closest<HTMLElement>('.detalhe-item-remover');
        if (!btnRemover) return;
        estado.itensEditando = removerItemPorId(estado.itensEditando, btnRemover.dataset.id ?? '');
        renderDetalheItens(els, estado.itensEditando, true);
    });

    els.detalheLista.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (!target.classList.contains('detalhe-item-qtd')) return;

        const id = target.dataset.id ?? '';
        const quantidadeDesejada = Number(target.value) || 1;

        const resultado = atualizarQuantidadeComValidacao(estado.itensEditando, estado.itensOriginais, id, quantidadeDesejada);

        if (!resultado.ok) {
            showToast(resultado.erro ?? t('feedback.estoque_insuficiente'), 'warning');
            const itemAtual = estado.itensEditando.find((i) => String(i.id) === String(id));
            target.value = String(itemAtual?.quantidade ?? 1);
            return;
        }

        estado.itensEditando = resultado.itens;
        const item = estado.itensEditando.find((i) => String(i.id) === String(id));
        if (item) target.value = String(item.quantidade);
    });

    els.btnDetalheSalvar.addEventListener('click', async () => {
        if (bloquearSeConvidado()) return;
        if (!estado.idDetalheAberto) return;

        setButtonLoading(els.btnConfirmarDevolucao, true);
        try {
            await salvarItensEmprestimo(estado.idDetalheAberto, estado.itensEditando);
            showToast('Empréstimo atualizado com sucesso', 'success');
            setModoEdicao(els, estado, false);
            renderDetalheItens(els, estado.itensEditando, false);
        } catch (erro) {
            showToast(formatarErroEstoque(erro, 'feedback.erro_atualizar_emprestimo'), 'error');
        } finally {
            setButtonLoading(els.btnConfirmarDevolucao, false);
        }
    });
}
