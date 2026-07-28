import { showToast, closeModal } from '../../core/ui/index.js';
import { getLoansAbertos } from '../../core/state/loans.js';
import { ehLayoutEmpilhado } from '../../core/utils/viewport.js';
import { LAYOUT_EMPILHADO_BREAKPOINT } from '../../core/constants/breakpoints.js';
import { formatarErroEstoque } from '../../core/utils/erroEstoque.js';
import {
    renderDetalheItens,
    abrirDetalhe,
    fecharDetalhe,
    setModoEdicao,
    abrirModalConfirmacao,
    fecharPainelMobile
} from './render.js';
import {
    adicionarOuIncrementarItem,
    removerItemPorId,
    atualizarQuantidadeItem,
    confirmarDevolucao,
    salvarItensEmprestimo
} from './service.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';

export function attachDevolucaoEvents(els, estado) {
    els.lista.addEventListener('click', (e) => {
        const btnDevolver = e.target.closest('.devolver-btn');
        if (btnDevolver) {
            if (bloquearSeConvidado()) return;
            abrirModalConfirmacao(els, estado, btnDevolver.dataset.id);
            return;
        }

        const card = e.target.closest('.devolucao-item');
        if (!card) return;

        const loan = getLoansAbertos().find((l) => String(l.id) === String(card.dataset.id));
        if (loan) abrirDetalhe(els, estado, loan);
    });

    els.btnConfirmarDevolucao.addEventListener('click', async () => {
        if (bloquearSeConvidado()) return;
        if (!estado.idPendente) return;

        await confirmarDevolucao(estado.idPendente);
        showToast(`Devolução registrada para ${els.devolucaoDataInput.value}`, 'success');
        closeModal('modal-confirmar-devolucao');
        estado.idPendente = null;
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

        const quantidade = Number(els.detalheQuantidadeInput.value) || 1;
        const nome = els.detalheEquipamentoSelect.options[els.detalheEquipamentoSelect.selectedIndex].text;

        estado.itensEditando = adicionarOuIncrementarItem(estado.itensEditando, {
            id: els.detalheEquipamentoSelect.value,
            nome,
            quantidade
        });

        renderDetalheItens(els, estado.itensEditando, true);
        els.detalheEquipamentoSelect.value = '';
        els.detalheQuantidadeInput.value = 1;
    });

    els.detalheLista.addEventListener('click', (e) => {
        const btnRemover = e.target.closest('.detalhe-item-remover');
        if (!btnRemover) return;
        estado.itensEditando = removerItemPorId(estado.itensEditando, btnRemover.dataset.id);
        renderDetalheItens(els, estado.itensEditando, true);
    });

    els.detalheLista.addEventListener('change', (e) => {
        if (!e.target.classList.contains('detalhe-item-qtd')) return;
        estado.itensEditando = atualizarQuantidadeItem(estado.itensEditando, e.target.dataset.id, e.target.value);
        const item = estado.itensEditando.find((i) => i.id === e.target.dataset.id);
        if (item) e.target.value = item.quantidade;
    });

    els.btnDetalheSalvar.addEventListener('click', async () => {
        if (bloquearSeConvidado()) return;
        try {
            await salvarItensEmprestimo(estado.idDetalheAberto, estado.itensEditando);
            showToast('Empréstimo atualizado com sucesso', 'success');
            setModoEdicao(els, estado, false);
            renderDetalheItens(els, estado.itensEditando, false);
        } catch (erro) {
            showToast(formatarErroEstoque(erro, 'Erro ao atualizar empréstimo'), 'error');
        }
    });
}