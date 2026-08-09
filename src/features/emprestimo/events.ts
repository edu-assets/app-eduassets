import { showToast, openModal } from '../../core/ui/index.js';
import { removerItemPorId } from '../../core/utils/listaItens.js';
import { formatarErroEstoque } from '../../core/utils/erroEstoque.js';
import { renderItens, renderModalItens } from './render.js';
import { adicionarItemComValidacao, registrarEmprestimo } from './service.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';
import type { LoanItemUI, LoanDraft } from '../../types/index.js';
import type { FlatpickrInstance } from '../../core/ui/datepicker.js';

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

export function attachEmprestimoEvents(els: EmprestimoEventosEls, estado: EmprestimoEventosEstado): void {
    els.btnAdicionar.addEventListener('click', () => {
        if (!els.equipamentoSelect.value) {
            els.equipamentoSelect.reportValidity();
            return;
        }

        const equipamentoId = els.equipamentoSelect.value;
        const quantidade = Number(els.quantidadeInput.value) || 1;
        const nome = els.equipamentoSelect.options[els.equipamentoSelect.selectedIndex].text;

        const resultado = adicionarItemComValidacao(estado.itens, { id: equipamentoId, nome, quantidade });

        if (!resultado.ok) {
            showToast(resultado.erro ?? 'Estoque insuficiente.', 'warning');
            return;
        }

        estado.itens = resultado.itens;
        renderItens(els, estado.itens);
        els.equipamentoSelect.value = '';
        els.quantidadeInput.value = '1';
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
        }
    });

    els.modalItensLista.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btnRemover = target.closest<HTMLElement>('.item-emprestimo-remover');
        if (!btnRemover) return;
        estado.itens = removerItemPorId(estado.itens, btnRemover.dataset.id ?? '');
        renderItens(els, estado.itens);
        renderModalItens(els, estado.itens);
    });

    els.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (bloquearSeConvidado()) return;

        if (!els.form.checkValidity()) {
            els.form.reportValidity();
            return;
        }

        const dataSelecionada = els.picker.selectedDates[0] || new Date();

        const dados: LoanDraft = {
            aluno: els.solicitanteInput.value,
            responsavelId: els.responsavelSelect.value,
            itens: estado.itens,
            dataRetiradaISO: dataSelecionada.toISOString(),
            observacao: els.observacaoInput.value
        };

        els.btnSubmit.disabled = true;

        try {
            await registrarEmprestimo(dados);
            showToast('Empréstimo registrado com sucesso', 'success');
            els.form.reset();
            els.picker.setDate(new Date(), false);
            els.dataInput.classList.add('input-auto');
            estado.itens = [];
            renderItens(els, estado.itens);
        } catch (erro) {
            showToast(formatarErroEstoque(erro, 'Erro ao registrar empréstimo.'), 'error');
        } finally {
            els.btnSubmit.disabled = false;
        }
    });
}