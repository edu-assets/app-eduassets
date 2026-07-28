import { openModal } from '../../core/ui/index.js';
import { formatarDataCard } from './utils.js';
import {
    renderDevolucaoTabelaHeader,
    renderDevolucaoCard,
    renderDevolucaoEmptyState,
    renderDetalheItensView,
    renderDetalheItensEdit,
    renderDetalheObservacao
} from './templates.js';
import { renderOpcaoEquipamento } from '../emprestimo/templates.js';

export function renderLista(els, estado, loans) {
    if (!loans.length) {
        els.lista.innerHTML = renderDevolucaoEmptyState();
        fecharDetalhe(els, estado);
        return;
    }

    els.lista.innerHTML = renderDevolucaoTabelaHeader() + loans.map(renderDevolucaoCard).join('');

    if (estado.idDetalheAberto) {
        const aindaExiste = loans.some((loan) => loan.id === estado.idDetalheAberto);
        aindaExiste ? marcarLinhaSelecionada(els, estado.idDetalheAberto) : fecharDetalhe(els, estado);
    }
}

export function renderDetalheItens(els, itens, editMode) {
    els.detalheItensContagem.textContent = `(${itens.length})`;
    els.detalheLista.innerHTML = editMode ? renderDetalheItensEdit(itens) : renderDetalheItensView(itens);
}

export function renderObservacao(els, observacao) {
    const conteudo = renderDetalheObservacao(observacao);
    els.detalheObs.style.display = conteudo ? 'block' : 'none';
    els.detalheObs.innerHTML = conteudo;
}

export function abrirDetalhe(els, estado, loan) {
    estado.idDetalheAberto = loan.id;
    estado.itensEditando = loan.itens.map((item) => ({ ...item }));

    els.detalheResp.textContent = loan.responsavel;
    els.detalheAluno.textContent = loan.aluno;
    els.detalheData.textContent = `Empréstimo realizado em ${formatarDataCard(loan.createdAt)}`;

    setModoEdicao(els, estado, false);
    renderDetalheItens(els, estado.itensEditando, false);
    renderObservacao(els, loan.observacao);

    mostrarDetalhe(els);
    marcarLinhaSelecionada(els, loan.id);

    if (window.matchMedia('(max-width: 1024px)').matches) abrirPainelMobile(els);
}

export function popularSelectDetalheEquipamento(select, equipamentos) {
    const placeholder = '<option value="" disabled selected hidden>Selecionar equipamento</option>';
    select.innerHTML = placeholder + equipamentos.map(renderOpcaoEquipamento).join('');
}

export function fecharDetalhe(els, estado) {
    estado.idDetalheAberto = null;
    estado.itensEditando = [];
    setModoEdicao(els, estado, false);
    els.detalheConteudo.style.display = 'none';
    els.detalheEmpty.style.display = 'flex';
    marcarLinhaSelecionada(els, null);
    fecharPainelMobile(els);
}

export function mostrarDetalhe(els) {
    els.detalheEmpty.style.display = 'none';
    els.detalheConteudo.style.display = 'flex';
}

export function setModoEdicao(els, estado, ativo) {
    estado.modoEdicaoAtivo = ativo;
    els.detalheEditWrap.style.display = ativo ? 'block' : 'none';
    els.btnDetalheEditar.style.display = ativo ? 'none' : 'inline-flex';
    els.btnDetalheSalvar.style.display = ativo ? 'inline-flex' : 'none';
    els.btnConfirmarDevolucaoPainel.style.display = ativo ? 'none' : 'inline-flex';
    els.btnDetalheCancelar.textContent = ativo ? 'Cancelar edição' : 'Cancelar';
}

export function marcarLinhaSelecionada(els, id) {
    els.lista.querySelectorAll('.devolucao-item').forEach((el) => {
        el.classList.toggle('selected', String(el.dataset.id) === String(id));
    });
}

export function abrirPainelMobile(els) {
    if (!els.painel || !els.backdrop) return;
    els.painel.classList.add('mobile-aberto');
    els.backdrop.classList.add('active');
}

export function fecharPainelMobile(els) {
    if (!els.painel || !els.backdrop) return;
    els.painel.classList.remove('mobile-aberto');
    els.backdrop.classList.remove('active');
}

export function abrirModalConfirmacao(els, estado, id) {
    estado.idPendente = id;
    els.devolucaoPicker.setDate(new Date(), false);
    els.devolucaoDataInput.classList.add('input-auto');
    openModal('modal-confirmar-devolucao');
}