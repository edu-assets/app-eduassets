import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { criarDataAutoPicker } from '../../core/ui/index.js';
import { renderLista, popularSelectDetalheEquipamento } from './render.js';
import { attachDevolucaoEvents } from './events.js';
import { getLoansAbertos, subscribe } from '../../core/state/loanStore.js';
import type { LoanItemUI } from '../../types/index.js';

export async function initDevolucao(): Promise<void> {
    const lista = document.getElementById('lista-devolucoes-items');
    if (!lista) return;

    const devolucaoDataInput = document.getElementById('modal-devolucao-data') as HTMLInputElement;
    const detalheEquipamentoSelect = document.getElementById('detalhe-equipamento') as HTMLSelectElement;

    const els = {
        lista: lista as HTMLElement,
        devolucaoDataInput,
        confirmarDevolucaoResumo: document.getElementById('modal-confirmar-devolucao-resumo'),
        btnCancelarDevolucao: document.getElementById('modal-confirmar-devolucao-cancelar'),
        btnConfirmarDevolucao: document.getElementById('btn-confirmar-devolucao') as HTMLButtonElement,
        detalheEmpty: document.getElementById('devolucao-detalhe-empty') as HTMLElement,
        detalheConteudo: document.getElementById('devolucao-detalhe-conteudo') as HTMLElement,
        detalhePapelIcon: document.getElementById('detalhe-papel-icon'),
        detalheResp: document.getElementById('detalhe-emprestimo-resp') as HTMLElement,
        detalheAluno: document.getElementById('detalhe-emprestimo-aluno') as HTMLElement,
        detalheData: document.getElementById('detalhe-emprestimo-data') as HTMLElement,
        detalheObs: document.getElementById('detalhe-emprestimo-obs') as HTMLElement,
        detalheLista: document.getElementById('detalhe-emprestimo-lista') as HTMLElement,
        detalheItensContagem: document.getElementById('detalhe-itens-contagem') as HTMLElement,
        detalheEditWrap: document.getElementById('detalhe-emprestimo-edit') as HTMLElement,
        detalheEquipamentoSelect,
        detalheQuantidadeInput: document.getElementById('detalhe-quantidade') as HTMLInputElement,
        btnDetalheAdicionarItem: document.getElementById('btn-detalhe-adicionar-item') as HTMLButtonElement,
        btnDetalheEditar: document.getElementById('btn-detalhe-editar') as HTMLElement,
        btnDetalheSalvar: document.getElementById('btn-detalhe-salvar') as HTMLButtonElement,
        btnDetalheFechar: document.getElementById('btn-detalhe-fechar') as HTMLElement,
        btnDetalheCancelar: document.getElementById('btn-detalhe-cancelar') as HTMLElement,
        btnConfirmarDevolucaoPainel: document.getElementById('btn-confirmar-devolucao-painel') as HTMLElement,
        painel: document.querySelector('.devolucao-detalhe-painel') as HTMLElement | null,
        backdrop: document.getElementById('devolucao-detalhe-backdrop'),
        devolucaoPicker: await criarDataAutoPicker(devolucaoDataInput)
    };

    popularSelectDetalheEquipamento(els.detalheEquipamentoSelect, getEquipamentos());

    const estado: {
        idPendente: string | number | null;
        idDetalheAberto: number | null;
        itensEditando: LoanItemUI[];
        itensOriginais: LoanItemUI[];
        modoEdicaoAtivo: boolean;
    } = {
        idPendente: null,
        idDetalheAberto: null,
        itensEditando: [],
        itensOriginais: [],
        modoEdicaoAtivo: false
    };

    attachDevolucaoEvents(els, estado);

    renderLista(els, estado, getLoansAbertos());
    subscribe(() => renderLista(els, estado, getLoansAbertos()));
}