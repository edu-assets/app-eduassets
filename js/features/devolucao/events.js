import { showToast, closeModal } from '../../core/ui/index.js';
import { getLoansAbertos } from '../../core/state/loans.js';
import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { ehLayoutEmpilhado } from '../../core/utils/viewport.js';
import { LAYOUT_EMPILHADO_BREAKPOINT } from '../../core/constants/breakpoints.js';
import { formatarErroEstoque } from '../../core/utils/erroEstoque.js';
import { calcularDisponivelEfetivo } from '../../core/utils/estoqueDisponivel.js';
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

    if (els.btnCancelarDevolucao) {
        els.btnCancelarDevolucao.addEventListener('click', () => {
            estado.idPendente = null;
            closeModal('modal-confirmar-devolucao');
        });
    }

    els.btnConfirmarDevolucao.addEventListener('click', async () => {
        if (bloquearSeConvidado()) return;
        if (!estado.idPendente) return;

        els.btnConfirmarDevolucao.disabled = true;
        try {
            await confirmarDevolucao(estado.idPendente);
            showToast(`Devolução registrada para ${els.devolucaoDataInput.value}`, 'success');
            closeModal('modal-confirmar-devolucao');
            estado.idPendente = null;
        } catch (erro) {
            showToast(erro instanceof Error ? erro.message : 'Erro ao registrar devolução.', 'error');
        } finally {
            els.btnConfirmarDevolucao.disabled = false;
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

        const equipamento = getEquipamentos().find((eq) => String(eq.id) === String(equipamentoId));
        const reservadoOriginal = estado.itensOriginais?.find((item) => String(item.id) === String(equipamentoId))?.quantidade ?? 0;
        const jaNoRascunho = estado.itensEditando.find((item) => String(item.id) === String(equipamentoId))?.quantidade ?? 0;
        const disponivelEfetivo = calcularDisponivelEfetivo(equipamento, reservadoOriginal);

        if (jaNoRascunho + quantidade > disponivelEfetivo) {
            showToast(`Estoque insuficiente: ${nome} (disponível: ${disponivelEfetivo}, já neste empréstimo: ${jaNoRascunho})`, 'warning');
            return;
        }

        estado.itensEditando = adicionarOuIncrementarItem(estado.itensEditando, {
            id: equipamentoId,
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

    els.detalheLista.addEventListener('input', (e) => {
        if (!e.target.classList.contains('detalhe-item-qtd')) return;

        const id = e.target.dataset.id;
        const quantidadeDesejada = Math.max(1, Number(e.target.value) || 1);

        const equipamento = getEquipamentos().find((eq) => String(eq.id) === String(id));
        const reservadoOriginal = estado.itensOriginais?.find((item) => String(item.id) === String(id))?.quantidade ?? 0;
        const disponivelEfetivo = calcularDisponivelEfetivo(equipamento, reservadoOriginal);

        if (quantidadeDesejada > disponivelEfetivo) {
            showToast(`Estoque insuficiente: apenas ${disponivelEfetivo} unidade(s) disponível(is) para este equipamento.`, 'warning');
            const itemAtual = estado.itensEditando.find((i) => String(i.id) === String(id));
            e.target.value = itemAtual?.quantidade ?? 1;
            return;
        }

        estado.itensEditando = atualizarQuantidadeItem(estado.itensEditando, id, quantidadeDesejada);
        const item = estado.itensEditando.find((i) => String(i.id) === String(id));
        if (item) e.target.value = item.quantidade;
    });

    els.btnDetalheSalvar.addEventListener('click', async () => {
        if (bloquearSeConvidado()) return;
        els.btnDetalheSalvar.disabled = true;
        try {
            await salvarItensEmprestimo(estado.idDetalheAberto, estado.itensEditando);
            showToast('Empréstimo atualizado com sucesso', 'success');
            setModoEdicao(els, estado, false);
            renderDetalheItens(els, estado.itensEditando, false);
        } catch (erro) {
            showToast(formatarErroEstoque(erro, 'Erro ao atualizar empréstimo'), 'error');
        } finally {
            els.btnDetalheSalvar.disabled = false;
        }
    });
}