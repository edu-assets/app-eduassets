import { showToast, openModal } from '../../core/ui/index.js';
import { adicionarOuIncrementarItem, removerItemPorId } from '../../core/utils/listaItens.js';
import { renderItens, renderModalItens } from './render.js';
import { registrarEmprestimo } from './service.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';


export function attachEmprestimoEvents(els, estado) {
    els.btnAdicionar.addEventListener('click', () => {
        if (!els.equipamentoSelect.value) {
            els.equipamentoSelect.reportValidity();
            return;
        }

        const quantidade = Number(els.quantidadeInput.value) || 1;
        const nome = els.equipamentoSelect.options[els.equipamentoSelect.selectedIndex].text;

        estado.itens = adicionarOuIncrementarItem(estado.itens, {
            id: els.equipamentoSelect.value,
            nome,
            quantidade
        });

        renderItens(els, estado.itens);
        els.equipamentoSelect.value = '';
        els.quantidadeInput.value = 1;
    });

    els.itensList.addEventListener('click', (e) => {
        if (e.target.closest('.itens-emprestimo-mais')) {
            renderModalItens(els, estado.itens);
            openModal('modal-itens-emprestimo');
            return;
        }

        const btnRemover = e.target.closest('.item-emprestimo-remover');
        if (btnRemover) {
            estado.itens = removerItemPorId(estado.itens, btnRemover.dataset.id);
            renderItens(els, estado.itens);
        }
    });

    els.modalItensLista.addEventListener('click', (e) => {
        const btnRemover = e.target.closest('.item-emprestimo-remover');
        if (!btnRemover) return;
        estado.itens = removerItemPorId(estado.itens, btnRemover.dataset.id);
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

        const dados = {
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
            showToast(erro instanceof Error ? erro.message : 'Erro ao registrar empréstimo.', 'error');
        } finally {
            els.btnSubmit.disabled = false;
        }
    });
}