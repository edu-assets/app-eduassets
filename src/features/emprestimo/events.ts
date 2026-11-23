import { showToast, openModal } from '../../core/ui/index.js';
import { removerItemPorId } from '../../core/utils/listaItens.js';
import { renderItens, renderModalItens, popularSelectEquipamentos, disponivelRestante, capacidadeRestante } from './render.js';
import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { adicionarItemComValidacao, registrarEmprestimo, textoDisponivelAgora } from './service.js';
import { registrarComFluxo } from './agendamento.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';
import type { LoanItemUI, LoanDraft } from '../../types/index.js';
import { definirAgora, fimDoDia, type FlatpickrInstance } from '../../core/ui/datepicker.js';
import { formatarDataHora, t } from '../../core/state/i18nStore.js';
import { agora } from '../../core/time/serverClock.js';
import { DURACAO_MAXIMA_AGENDAMENTO_MS, ehAgendamento } from '../../core/utils/estoque.js';
import { setButtonLoading } from '../../shared/dom/buttonLoading.js';
import { limparErroCampo, sinalizarErroCampo } from '../../shared/forms/fieldErrors.js';

interface EmprestimoEventosEls {
    form: HTMLFormElement;
    dataInput: HTMLInputElement;
    equipamentoSelect: HTMLSelectElement;
    quantidadeInput: HTMLInputElement;
    btnAdicionar: HTMLButtonElement;
    itensList: HTMLElement;
    itensCount: HTMLElement | null;
    modalItensLista: HTMLElement;
    responsavelSelect: HTMLSelectElement;
    solicitanteInput: HTMLInputElement;
    observacaoInput: HTMLTextAreaElement;
    btnSubmit: HTMLButtonElement;
    picker: FlatpickrInstance;
    /** Campo "Devolução prevista" (flatpickr). */
    previstaInput: HTMLInputElement;
    previstaPicker: FlatpickrInstance;
    /** Preenchido por `attachEmprestimoEvents`: o index liga os pickers a estas funções. */
    ganchos?: { retiradaMudou?: () => void; previstaMudou?: () => void };
}

interface EmprestimoEventosEstado {
    itens: LoanItemUI[];
}

const LIMITE_OBSERVACAO = 250;

function atualizarContador(els: Pick<EmprestimoEventosEls, 'observacaoInput'>): void {
    const contador = document.getElementById('observacao-contador');
    if (contador) contador.textContent = `${els.observacaoInput.value.length}/${els.observacaoInput.maxLength > 0 ? els.observacaoInput.maxLength : LIMITE_OBSERVACAO}`;
}

function limparErroQuantidade(input: HTMLInputElement, erro: HTMLElement | null): void {
    input.removeAttribute('aria-invalid');
    if (erro) {
        erro.textContent = '';
        erro.hidden = true;
    }
}

function definirAviso(aviso: HTMLElement | null, texto: string): void {
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.hidden = !texto;
}

/* ===== Janela (retirada / devolução prevista) e rótulo do botão ===== */

const UMA_HORA_MS = 3_600_000;

function noMinuto(data: Date): Date {
    const d = new Date(data);
    d.setSeconds(0, 0);
    return d;
}

/** Retirada escolhida pelo usuário; null enquanto o campo é automático ("agora"). */
function retiradaEditada(els: Pick<EmprestimoEventosEls, 'dataInput' | 'picker'>): Date | null {
    if (els.dataInput.classList.contains('input-auto')) return null;
    return els.picker.selectedDates[0] ?? null;
}

/** Padrão da devolução prevista: início + 1 h para agendamentos; fim do dia local para retirada imediata. */
export function devolucaoPrevistaPadrao(inicio: Date, agendando: boolean, referencia: Date): Date {
    if (agendando) return new Date(inicio.getTime() + UMA_HORA_MS);
    const fimDia = fimDoDia(referencia);
    return fimDia.getTime() > inicio.getTime() ? fimDia : new Date(inicio.getTime() + UMA_HORA_MS);
}

/**
 * Mantém "Devolução prevista" coerente com a retirada: enquanto não foi editada acompanha o padrão; editada, só é
 * refeita se ficou antes da retirada (ou além de 15 dias de um agendamento).
 */
export function sincronizarJanela(els: Pick<EmprestimoEventosEls, 'dataInput' | 'picker' | 'previstaInput' | 'previstaPicker'>): void {
    const referencia = agora();
    const editada = retiradaEditada(els);
    const inicio = noMinuto(editada ?? referencia);
    const agendando = editada !== null && ehAgendamento(editada, referencia);
    const padrao = devolucaoPrevistaPadrao(inicio, agendando, referencia);

    els.previstaPicker.set('minDate', editada ?? undefined);
    els.previstaPicker.set('maxDate', agendando ? new Date(inicio.getTime() + DURACAO_MAXIMA_AGENDAMENTO_MS) : undefined);

    const automatica = els.previstaInput.classList.contains('input-auto');
    const atual = els.previstaPicker.selectedDates[0];
    const invalida = !atual || atual.getTime() < inicio.getTime()
        || (agendando && atual.getTime() - inicio.getTime() > DURACAO_MAXIMA_AGENDAMENTO_MS);
    if (automatica || invalida) {
        els.previstaPicker.setDate(padrao, false);
        els.previstaInput.classList.add('input-auto');
    }
}

/** Botão do envio: "Agendar" quando a retirada está a mais de 5 min no futuro; senão "Registrar Empréstimo". */
export function atualizarRotuloSubmit(els: Pick<EmprestimoEventosEls, 'dataInput' | 'picker' | 'btnSubmit'>): void {
    const editada = retiradaEditada(els);
    const agendar = editada !== null && ehAgendamento(editada, agora());
    const chave = agendar ? 'emprestimo.agendar' : 'emprestimo.registrar_emprestimo';
    const alvo = els.btnSubmit.querySelector<HTMLElement>(':scope > .btn-label') ?? els.btnSubmit;
    alvo.dataset.i18nKey = chave;
    const icone = alvo.querySelector<HTMLElement>('.material-symbols-outlined');
    if (icone) icone.textContent = agendar ? 'event' : 'check';
    const texto = Array.from(alvo.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
    if (texto) texto.textContent = t(chave);
    else alvo.append(t(chave));
    els.btnSubmit.dataset.agendar = agendar ? 'true' : 'false';
}

/** Ajusta o max da quantidade ao modelo selecionado e mostra/limpa o erro inline. */
export function atualizarLimiteQuantidade(
    els: Pick<EmprestimoEventosEls, 'equipamentoSelect' | 'quantidadeInput'>,
    estado: EmprestimoEventosEstado
): void {
    const erro = document.getElementById('quantidade-erro');
    const equipamento = getEquipamentos().find((eq) => String(eq.id) === els.equipamentoSelect.value);
    if (!equipamento) {
        els.quantidadeInput.removeAttribute('max');
        limparErroQuantidade(els.quantidadeInput, erro);
        return;
    }

    // O limite é a capacidade (dá para agendar o que não está na prateleira agora); acima do disponível agora só avisa.
    const max = capacidadeRestante(equipamento, estado.itens);
    els.quantidadeInput.max = String(max);
    const quantidade = Number(els.quantidadeInput.value) || 0;
    const aviso = document.getElementById('quantidade-aviso');

    if (max <= 0 || quantidade > max) {
        els.quantidadeInput.setAttribute('aria-invalid', 'true');
        if (erro) {
            erro.textContent = max <= 0
                ? t('emprestimo.sem_unidades_disponiveis')
                : t('emprestimo.quantidade_maxima').replace('{max}', String(max));
            erro.hidden = false;
        }
        definirAviso(aviso, '');
        return;
    }

    limparErroQuantidade(els.quantidadeInput, erro);
    const agoraLivre = disponivelRestante(equipamento, estado.itens);
    definirAviso(aviso, quantidade > agoraLivre ? textoDisponivelAgora(agoraLivre) : '');
}

function sincronizarDisponibilidade(els: EmprestimoEventosEls, estado: EmprestimoEventosEstado): void {
    popularSelectEquipamentos(els.equipamentoSelect, getEquipamentos(), estado.itens);
    atualizarLimiteQuantidade(els, estado);
}

export function attachEmprestimoEvents(els: EmprestimoEventosEls, estado: EmprestimoEventosEstado): void {
    const aoMudarRetirada = (): void => {
        sincronizarJanela(els);
        atualizarRotuloSubmit(els);
    };
    if (els.ganchos) {
        els.ganchos.retiradaMudou = aoMudarRetirada;
        els.ganchos.previstaMudou = () => limparErroCampo(els.previstaInput);
    }

    els.equipamentoSelect.addEventListener('change', () => atualizarLimiteQuantidade(els, estado));
    els.quantidadeInput.addEventListener('input', () => atualizarLimiteQuantidade(els, estado));
    els.observacaoInput.addEventListener('input', () => atualizarContador(els));
    els.form.addEventListener('reset', () => setTimeout(() => {
        atualizarContador(els);
        sincronizarDisponibilidade(els, estado);
        if (els.previstaPicker) aoMudarRetirada();
    }, 0));
    atualizarContador(els);

    els.btnAdicionar.addEventListener('click', () => {
        if (!els.equipamentoSelect.value) {
            // O select não é `required` (a lista é que precisa de itens): erro inline próprio, sem balão nativo.
            sinalizarErroCampo(els.equipamentoSelect, t('emprestimo.erro_selecione_equipamento'));
            return;
        }

        const equipamentoId = els.equipamentoSelect.value;
        const quantidade = Number(els.quantidadeInput.value) || 1;
        const equipamentoSel = getEquipamentos().find((eq) => String(eq.id) === String(equipamentoId));
        const nome = equipamentoSel?.modelo ?? els.equipamentoSelect.options[els.equipamentoSelect.selectedIndex].text;

        const resultado = adicionarItemComValidacao(estado.itens, { id: equipamentoId, nome, quantidade });

        if (!resultado.ok) {
            showToast(resultado.erro ?? t('feedback.estoque_insuficiente'), 'warning');
            return;
        }
        // (resultado.aviso: a quantidade passa do disponível agora; o aviso inline já foi exibido junto ao campo.)

        estado.itens = resultado.itens;
        renderItens(els, estado.itens);
        limparErroCampo(els.equipamentoSelect);
        els.equipamentoSelect.value = '';
        els.quantidadeInput.value = '1';
        sincronizarDisponibilidade(els, estado);
    });

    els.itensList.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        if (target.closest('.itens-emprestimo-mais')) {
            renderModalItens(els, estado.itens);
            openModal('modal-itens-emprestimo');
            return;
        }

        const btnRemover = target.closest<HTMLElement>('.item-emprestimo-remover');
        if (btnRemover) {
            estado.itens = removerItemPorId(estado.itens, btnRemover.dataset.id ?? '');
            renderItens(els, estado.itens);
            sincronizarDisponibilidade(els, estado);
        }
    });

    els.modalItensLista.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btnRemover = target.closest<HTMLElement>('.item-emprestimo-remover');
        if (!btnRemover) return;
        estado.itens = removerItemPorId(estado.itens, btnRemover.dataset.id ?? '');
        renderItens(els, estado.itens);
        renderModalItens(els, estado.itens);
        sincronizarDisponibilidade(els, estado);
    });

    els.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (bloquearSeConvidado()) return;

        if (!els.form.checkValidity()) {
            els.form.reportValidity();
            return;
        }

        // Regra de negócio (ao menos um item): aviso inline no campo de equipamento, não um toast.
        if (!estado.itens.length) {
            sinalizarErroCampo(els.equipamentoSelect, t('validation.emprestimo.sem_itens'));
            return;
        }

        const referencia = agora();
        const editada = retiradaEditada(els);
        const agendando = editada !== null && ehAgendamento(editada, referencia);
        const inicio = editada ?? referencia;

        // Devolução prevista automática acompanha o padrão no momento do envio (o dia pode ter virado).
        const previstaAutomatica = els.previstaInput.classList.contains('input-auto');
        const prevista = (!previstaAutomatica && els.previstaPicker.selectedDates[0])
            || devolucaoPrevistaPadrao(noMinuto(inicio), agendando, referencia);

        if (prevista.getTime() < noMinuto(inicio).getTime()) {
            sinalizarErroCampo(els.previstaInput, t('emprestimo.devolucao_prevista_antes_retirada'));
            return;
        }
        if (agendando && prevista.getTime() - inicio.getTime() > DURACAO_MAXIMA_AGENDAMENTO_MS) {
            sinalizarErroCampo(els.previstaInput, t('agendamento.erro_fim_muito_longo'));
            return;
        }

        const dados: LoanDraft = {
            aluno: els.solicitanteInput.value,
            responsavelId: els.responsavelSelect.value,
            itens: estado.itens,
            dataRetiradaISO: editada ? editada.toISOString() : undefined,
            dataPrevistaDevolucaoISO: prevista.toISOString(),
            observacao: els.observacaoInput.value
        };

        // O botão só fica em "carregando" durante o envio (os modais de agendamento esperam o usuário).
        const enviar = async (rascunho: LoanDraft): Promise<unknown> => {
            setButtonLoading(els.btnSubmit, true);
            try {
                return await registrarEmprestimo(rascunho);
            } finally {
                setButtonLoading(els.btnSubmit, false);
            }
        };

        const desfecho = await registrarComFluxo({ dados, inicio, fim: prevista, agendando }, enviar);

        if (desfecho.tipo === 'cancelado') return;
        if (desfecho.tipo === 'erro') {
            showToast(desfecho.mensagem, 'error');
            return;
        }

        showToast(
            desfecho.agendado
                ? t('feedback.agendamento_registrado').replace('{data}', formatarDataHora(desfecho.inicio))
                : t('feedback.emprestimo_registrado'),
            'success'
        );
        els.form.reset();
        definirAgora(els.picker);
        els.dataInput.classList.add('input-auto');
        els.previstaInput.classList.add('input-auto');
        sincronizarJanela(els);
        atualizarRotuloSubmit(els);
        estado.itens = [];
        renderItens(els, estado.itens);
        sincronizarDisponibilidade(els, estado);
    });
}