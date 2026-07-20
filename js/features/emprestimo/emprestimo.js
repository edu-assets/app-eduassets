import { addLoan } from '../../core/state/loans.js';
import { showToast } from '../../core/toast/toast.js';
import { openModal } from '../../core/modal/modal.js';
import { criarDataAutoPicker } from '../../core/datepicker/datepicker.js';
import { escapeHtml } from '../../core/utils/sanitize.js';


const LIMITE_ITENS_FORM = 3;

export function initEmprestimo() {
    const form = document.querySelector('#panel-emprestimo form');
    if (!form) return;

    const dataInput = document.getElementById('data-emprestimo');
    const equipamentoSelect = document.getElementById('equipamento');
    const quantidadeInput = document.getElementById('quantidade');
    const btnAdicionar = document.getElementById('btn-adicionar-item');
    const itensList = document.getElementById('itens-emprestimo-list');
    const itensCount = document.getElementById('itens-emprestimo-count');
    const modalItensLista = document.getElementById('modal-itens-emprestimo-lista');

    const picker = criarDataAutoPicker(dataInput);
    let itens = [];

    btnAdicionar.addEventListener('click', () => {
        if (!equipamentoSelect.value) {
            equipamentoSelect.reportValidity();
            return;
        }

        const quantidade = Number(quantidadeInput.value) || 1;
        const nome = equipamentoSelect.options[equipamentoSelect.selectedIndex].text;
        const existente = itens.find((item) => item.id === equipamentoSelect.value);

        existente ? existente.quantidade += quantidade : itens.push({ id: equipamentoSelect.value, nome, quantidade });

        renderItens();
        equipamentoSelect.value = '';
        quantidadeInput.value = 1;
    });

    itensList.addEventListener('click', (e) => {
        if (e.target.closest('.itens-emprestimo-mais')) {
            modalItensLista.innerHTML = itens.map(renderItemRow).join('');
            openModal('modal-itens-emprestimo');
            return;
        }

        const btnRemover = e.target.closest('.item-emprestimo-remover');
        if (btnRemover) removerItem(btnRemover.dataset.id);
    });

    modalItensLista.addEventListener('click', (e) => {
        const btnRemover = e.target.closest('.item-emprestimo-remover');
        if (!btnRemover) return;
        removerItem(btnRemover.dataset.id);
        modalItensLista.innerHTML = itens.map(renderItemRow).join('');
    });

    function removerItem(id) {
        itens = itens.filter((item) => item.id !== id);
        renderItens();
    }

    function renderItens() {
        if (itensCount) itensCount.textContent = `(${itens.length})`;

        if (!itens.length) {
            itensList.innerHTML = `
                <div class="itens-emprestimo-empty">
                    <span class="material-symbols-outlined">inventory_2</span>
                    <span class="itens-emprestimo-empty-titulo">Nenhum item adicionado ainda.</span>
                    <span class="itens-emprestimo-empty-sub">Adicione equipamentos acima para criar a lista.</span>
                </div>
            `;
            return;
        }

        itensList.innerHTML = itens.map(renderItemRow).join('');
    }

    renderItens();

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!itens.length) {
            showToast('Adicione ao menos um equipamento ao empréstimo', 'error');
            return;
        }

        const responsavelSelect = document.getElementById('responsavel');
        const responsavelOption = responsavelSelect.options[responsavelSelect.selectedIndex];

        addLoan({
            aluno: document.getElementById('solicitante').value,
            responsavel: responsavelOption.text,
            itens,
            data: dataInput.value,
            observacao: document.getElementById('observacao').value
        });

        showToast('Empréstimo registrado com sucesso', 'success');
        form.reset();
        picker.setDate(new Date(), false);
        dataInput.classList.add('input-auto');
        itens = [];
        renderItens();
    });
}

function renderItemRow(item) {
    return `
        <div class="item-emprestimo-row">
            <div class="item-emprestimo-info">
                <span class="item-emprestimo-qtd">${item.quantidade}x</span>
                <span>${escapeHtml(item.nome)}</span>
            </div>
            <button type="button" class="item-emprestimo-remover" data-id="${item.id}" aria-label="Remover">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
    `;
}