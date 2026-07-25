import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { getResponsaveis } from '../../core/state/responsavelStore.js';
import { criarDataAutoPicker } from '../../core/ui/index.js';
import { attachEmprestimoEvents } from './events.js';
import { renderItens, popularSelectEquipamentos, popularSelectResponsaveis } from './render.js';

export function initEmprestimo() {
    const form = document.querySelector('#panel-emprestimo form');
    if (!form) return;

    const els = {
        form,
        dataInput: document.getElementById('data-emprestimo'),
        equipamentoSelect: document.getElementById('equipamento'),
        quantidadeInput: document.getElementById('quantidade'),
        btnAdicionar: document.getElementById('btn-adicionar-item'),
        itensList: document.getElementById('itens-emprestimo-list'),
        itensCount: document.getElementById('itens-emprestimo-count'),
        modalItensLista: document.getElementById('modal-itens-emprestimo-lista'),
        responsavelSelect: document.getElementById('responsavel'),
        solicitanteInput: document.getElementById('solicitante'),
        observacaoInput: document.getElementById('observacao'),
        btnSubmit: form.querySelector('.registrar-emprestimo')
    };

    els.picker = criarDataAutoPicker(els.dataInput);

    const estado = { itens: [] };

    popularSelectEquipamentos(els.equipamentoSelect, getEquipamentos());
    popularSelectResponsaveis(els.responsavelSelect, getResponsaveis());

    attachEmprestimoEvents(els, estado);

    renderItens(els, estado.itens);
}