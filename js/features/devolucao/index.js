import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { criarDataAutoPicker } from '../../core/ui/index.js';
import { renderLista, popularSelectDetalheEquipamento } from './render.js';
import { attachDevolucaoEvents } from './events.js';
import { getLoansAbertos, subscribe } from '../../core/state/loanStore.js';

export function initDevolucao() {
    const lista = document.getElementById('lista-devolucoes-items');
    if (!lista) return;

    const els = {
        lista,
        devolucaoDataInput: document.getElementById('modal-devolucao-data'),
        btnConfirmarDevolucao: document.getElementById('btn-confirmar-devolucao'),
        detalheEmpty: document.getElementById('devolucao-detalhe-empty'),
        detalheConteudo: document.getElementById('devolucao-detalhe-conteudo'),
        detalhePapelIcon: document.getElementById('detalhe-papel-icon'),
        detalheResp: document.getElementById('detalhe-emprestimo-resp'),
        detalheAluno: document.getElementById('detalhe-emprestimo-aluno'),
        detalheData: document.getElementById('detalhe-emprestimo-data'),
        detalheObs: document.getElementById('detalhe-emprestimo-obs'),
        detalheLista: document.getElementById('detalhe-emprestimo-lista'),
        detalheItensContagem: document.getElementById('detalhe-itens-contagem'),
        detalheEditWrap: document.getElementById('detalhe-emprestimo-edit'),
        detalheEquipamentoSelect: document.getElementById('detalhe-equipamento'),
        detalheQuantidadeInput: document.getElementById('detalhe-quantidade'),
        btnDetalheAdicionarItem: document.getElementById('btn-detalhe-adicionar-item'),
        btnDetalheEditar: document.getElementById('btn-detalhe-editar'),
        btnDetalheSalvar: document.getElementById('btn-detalhe-salvar'),
        btnDetalheFechar: document.getElementById('btn-detalhe-fechar'),
        btnDetalheCancelar: document.getElementById('btn-detalhe-cancelar'),
        btnConfirmarDevolucaoPainel: document.getElementById('btn-confirmar-devolucao-painel'),
        painel: document.querySelector('.devolucao-detalhe-painel'),
        backdrop: document.getElementById('devolucao-detalhe-backdrop'),
        detalheEquipamentoSelect: document.getElementById('detalhe-equipamento'),
    };

    popularSelectDetalheEquipamento(els.detalheEquipamentoSelect, getEquipamentos());

    els.devolucaoPicker = criarDataAutoPicker(els.devolucaoDataInput);

    const estado = {
        idPendente: null,
        idDetalheAberto: null,
        itensEditando: [],
        modoEdicaoAtivo: false
    };

    attachDevolucaoEvents(els, estado);

    renderLista(els, estado, getLoansAbertos());
    subscribe(() => renderLista(els, estado, getLoansAbertos()));
}