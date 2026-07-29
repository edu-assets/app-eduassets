import { showToast, openModal } from '../../core/ui/index.js';
import { adicionarOuIncrementarItem, removerItemPorId } from '../../core/utils/listaItens.js';
import { formatarErroEstoque } from '../../core/utils/erroEstoque.js';
import { calcularDisponivelEfetivo } from '../../core/utils/estoqueDisponivel.js';
import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { renderItens, renderModalItens } from './render.js';
import { registrarEmprestimo } from './service.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';


export function attachEmprestimoEvents(els, estado) {
    els.btnAdicionar.addEventListener('click', () => {
        if (!els.equipamentoSelect.value) {
            els.equipamentoSelect.reportValidity();
            return;
        }

        const equipamentoId = els.equipamentoSelect.value;
        const quantidade = Number(els.quantidadeInput.value) || 1;
        const nome = els.equipamentoSelect.options[els.equipamentoSelect.selectedIndex].text;

        const equipamento = getEquipamentos().find((eq) => String(eq.id) === String(equipamentoId));
        const jaNaLista = estado.itens.find((item) => String(item.id) === String(equipamentoId))?.quantidade ?? 0;
        const disponivel = calcularDisponivelEfetivo(equipamento);

        if (jaNaLista + quantidade > disponivel) {
            showToast(`Estoque insuficiente: ${nome} (disponível: ${disponivel}, já na lista: ${jaNaLista})`, 'warning');
            return;
        }

        estado.itens = adicionarOuIncrementarItem(estado.itens, {
            id: equipamentoId,
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
            showToast(formatarErroEstoque(erro, 'Erro ao registrar empréstimo.'), 'error');
        } finally {
            els.btnSubmit.disabled = false;
        }
    });
}