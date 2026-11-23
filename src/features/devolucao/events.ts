import { showToast, closeModal } from '../../core/ui/index.js';
import { getLoansAbertos, getLoansAtivos, getAgendamentos } from '../../core/state/loanStore.js';
import { confirmarRetiradaAgendamento, excluirAgendamentoComConfirmacao } from './agendamentoAcoes.js';
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
import { dataDevolucaoParaEnvio } from './utils.js';
import { atualizarAgora } from '../../core/state/liveSync.js';
import type { LoanItemUI } from '../../types/index.js';
import type { FlatpickrInstance } from '../../core/ui/datepicker.js';
import { setButtonLoading } from '../../shared/dom/buttonLoading.js';
import { limparErroCampo, sinalizarErroCampo } from '../../shared/forms/fieldErrors.js';

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
    btnDetalheConfirmarRetirada?: HTMLButtonElement | null;
    btnDetalheExcluirAgendamento?: HTMLElement | null;
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

        const btnRetirada = target.closest<HTMLElement>('.confirmar-retirada-btn');
        if (btnRetirada) {
            const alvo = getAgendamentos().find((l) => String(l.id) === String(btnRetirada.dataset.id));
            if (alvo) void confirmarRetiradaAgendamento(alvo);
            return;
        }

        const btnExcluir = target.closest<HTMLElement>('.excluir-agendamento-btn');
        if (btnExcluir) {
            const alvo = getAgendamentos().find((l) => String(l.id) === String(btnExcluir.dataset.id));
            if (alvo) void excluirAgendamentoComConfirmacao(alvo);
            return;
        }

        // O botão Detalhes (acessível por teclado) cai no mesmo caminho do clique no card.
        const card = target.closest<HTMLElement>('.devolucao-item');
        if (!card) return;

        const loan = getLoansAtivos().find((l) => String(l.id) === String(card.dataset.id));
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

        // Campo automático (não editado pelo usuário): o servidor registra o próprio horário.
        const dataAutomatica = els.devolucaoDataInput.classList.contains('input-auto');
        const selecionada = els.devolucaoPicker.selectedDates[0];
        if (!dataAutomatica && (!selecionada || Number.isNaN(selecionada.getTime()))) {
            // Input do flatpickr é readonly (fora da validação nativa): erro inline próprio.
            sinalizarErroCampo(els.devolucaoDataInput, t('devolucao.erro_data_obrigatoria'));
            return;
        }

        setButtonLoading(els.btnConfirmarDevolucao, true);
        try {
            const gravada = await confirmarDevolucao(Number(estado.idPendente), dataDevolucaoParaEnvio(dataAutomatica, selecionada));
            // Mostra o horário que o servidor gravou (no modo automático pode diferir do exibido no campo).
            const dataExibida = gravada
                ? els.devolucaoPicker.formatDate(gravada, els.devolucaoPicker.config.dateFormat)
                : els.devolucaoDataInput.value;
            showToast(t('feedback.devolucao_registrada').replace('{data}', dataExibida), 'success');
            closeModal('modal-confirmar-devolucao');
            estado.idPendente = null;
        } catch (erro) {
            showToast(traduzirErro(erro, 'feedback.erro_registrar_devolucao'), 'error');
            // Ex.: outra pessoa já devolveu este empréstimo: atualiza a lista em vez de esperar o próximo ciclo.
            void atualizarAgora();
        } finally {
            setButtonLoading(els.btnConfirmarDevolucao, false);
        }
    });

    els.btnConfirmarDevolucaoPainel.addEventListener('click', () => {
        if (!estado.idDetalheAberto) return;
        abrirModalConfirmacao(els, estado, estado.idDetalheAberto);
    });

    // Ações do painel de detalhes quando o item aberto é um agendamento.
    const agendamentoAberto = () => getAgendamentos().find((l) => l.id === estado.idDetalheAberto);
    els.btnDetalheConfirmarRetirada?.addEventListener('click', () => {
        const alvo = agendamentoAberto();
        if (alvo) void confirmarRetiradaAgendamento(alvo);
    });
    els.btnDetalheExcluirAgendamento?.addEventListener('click', () => {
        const alvo = agendamentoAberto();
        if (alvo) void excluirAgendamentoComConfirmacao(alvo);
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
        limparErroCampo(els.detalheEquipamentoSelect);
        setModoEdicao(els, estado, true);
        renderDetalheItens(els, estado.itensEditando, true);
    });

    els.btnDetalheAdicionarItem.addEventListener('click', () => {
        if (!els.detalheEquipamentoSelect.value) {
            sinalizarErroCampo(els.detalheEquipamentoSelect, t('devolucao.erro_selecione_equipamento'));
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
        limparErroCampo(els.detalheEquipamentoSelect);
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

        setButtonLoading(els.btnDetalheSalvar, true);
        try {
            await salvarItensEmprestimo(estado.idDetalheAberto, estado.itensEditando);
            estado.itensOriginais = estado.itensEditando.map((item) => ({ ...item }));
            showToast(t('feedback.emprestimo_atualizado'), 'success');
            setModoEdicao(els, estado, false);
            renderDetalheItens(els, estado.itensEditando, false);
        } catch (erro) {
            showToast(formatarErroEstoque(erro, 'feedback.erro_atualizar_emprestimo'), 'error');
        } finally {
            setButtonLoading(els.btnDetalheSalvar, false);
        }
    });
}
