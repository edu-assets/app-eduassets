import { showToast, openModal } from '../../core/ui/index.js';
import { removerItemPorId } from '../../core/utils/listaItens.js';
import { formatarErroEstoque } from '../../core/utils/erroEstoque.js';
import { renderItens, renderModalItens, popularSelectEquipamentos, disponivelRestante } from './render.js';
import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { adicionarItemComValidacao, registrarEmprestimo } from './service.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';
import type { LoanItemUI, LoanDraft } from '../../types/index.js';
import { definirAgora, type FlatpickrInstance } from '../../core/ui/datepicker.js';
import { t } from '../../core/state/i18nStore.js';
import { setButtonLoading } from '../../shared/dom/buttonLoading.js';

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

    const max = disponivelRestante(equipamento, estado.itens);
    els.quantidadeInput.max = String(max);
    const quantidade = Number(els.quantidadeInput.value) || 0;

    if (max <= 0 || quantidade > max) {
        els.quantidadeInput.setAttribute('aria-invalid', 'true');
        if (erro) {
            erro.textContent = max <= 0
                ? t('emprestimo.sem_unidades_disponiveis')
                : t('emprestimo.quantidade_maxima').replace('{max}', String(max));
            erro.hidden = false;
        }
    } else {
        limparErroQuantidade(els.quantidadeInput, erro);
    }
}

function sincronizarDisponibilidade(els: EmprestimoEventosEls, estado: EmprestimoEventosEstado): void {
    popularSelectEquipamentos(els.equipamentoSelect, getEquipamentos(), estado.itens);
    atualizarLimiteQuantidade(els, estado);
}

export function attachEmprestimoEvents(els: EmprestimoEventosEls, estado: EmprestimoEventosEstado): void {
    els.equipamentoSelect.addEventListener('change', () => atualizarLimiteQuantidade(els, estado));
    els.quantidadeInput.addEventListener('input', () => atualizarLimiteQuantidade(els, estado));
    els.observacaoInput.addEventListener('input', () => atualizarContador(els));
    els.form.addEventListener('reset', () => setTimeout(() => {
        atualizarContador(els);
        sincronizarDisponibilidade(els, estado);
    }, 0));
    atualizarContador(els);

    els.btnAdicionar.addEventListener('click', () => {
        if (!els.equipamentoSelect.value) {
            els.equipamentoSelect.reportValidity();
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

        estado.itens = resultado.itens;
        renderItens(els, estado.itens);
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

        const dataFoiEditadaManualmente = !els.dataInput.classList.contains('input-auto');
        const dataSelecionada = els.picker.selectedDates[0];

        const dados: LoanDraft = {
            aluno: els.solicitanteInput.value,
            responsavelId: els.responsavelSelect.value,
            itens: estado.itens,
            dataRetiradaISO: dataFoiEditadaManualmente && dataSelecionada ? dataSelecionada.toISOString() : undefined,
            observacao: els.observacaoInput.value
        };

        setButtonLoading(els.btnSubmit, true);

        try {
            await registrarEmprestimo(dados);
            showToast('Empréstimo registrado com sucesso', 'success');
            els.form.reset();
            definirAgora(els.picker);
            els.dataInput.classList.add('input-auto');
            estado.itens = [];
            renderItens(els, estado.itens);
            sincronizarDisponibilidade(els, estado);
        } catch (erro) {
            const chave = erro instanceof Error ? erro.message : null;
            const mensagem = chave && !chave.includes(' ') ? t(chave) : formatarErroEstoque(erro, 'feedback.erro_registrar_emprestimo');
            showToast(mensagem, 'error');
        } finally {
            setButtonLoading(els.btnSubmit, false);
        }
    });
}