import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { getResponsaveis } from '../../core/state/responsavelStore.js';
import { criarDataAutoPicker } from '../../core/ui/index.js';
import { attachEmprestimoEvents } from './events.js';
import { renderItens, popularSelectEquipamentos, popularSelectResponsaveis } from './render.js';
import type { LoanItemUI } from '../../types/index.js';

export function initEmprestimo(): void {
    const form = document.querySelector<HTMLFormElement>('#panel-emprestimo form');
    if (!form) return;

    const dataInput = document.getElementById('data-emprestimo') as HTMLInputElement;

    const els = {
        form,
        dataInput,
        equipamentoSelect: document.getElementById('equipamento') as HTMLSelectElement,
        quantidadeInput: document.getElementById('quantidade') as HTMLInputElement,
        btnAdicionar: document.getElementById('btn-adicionar-item') as HTMLButtonElement,
        itensList: document.getElementById('itens-emprestimo-list') as HTMLElement,
        itensCount: document.getElementById('itens-emprestimo-count'),
        modalItensLista: document.getElementById('modal-itens-emprestimo-lista') as HTMLElement,
        responsavelSelect: document.getElementById('responsavel') as HTMLSelectElement,
        solicitanteInput: document.getElementById('solicitante') as HTMLInputElement,
        observacaoInput: document.getElementById('observacao') as HTMLTextAreaElement,
        btnSubmit: form.querySelector('.registrar-emprestimo') as HTMLButtonElement,
        picker: criarDataAutoPicker(dataInput)
    };

    const estado: { itens: LoanItemUI[] } = { itens: [] };

    popularSelectEquipamentos(els.equipamentoSelect, getEquipamentos());
    popularSelectResponsaveis(els.responsavelSelect, getResponsaveis());

    attachEmprestimoEvents(els, estado);

    renderItens(els, estado.itens);
}