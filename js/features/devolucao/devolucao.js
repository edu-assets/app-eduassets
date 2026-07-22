import { getLoansAbertos, returnLoan, updateLoan, subscribe } from '../../core/state/loans.js';
import { showToast } from '../../core/toast/toast.js';
import { openModal, closeModal } from '../../core/modal/modal.js';
import { criarDataAutoPicker } from '../../core/datepicker/datepicker.js';
import { escapeHtml } from '../../core/utils/sanitize.js';

const LIMITE_ICONES_CARD = 3;

const EQUIPAMENTO_ICONS = {
    eq1: 'laptop',
    eq2: 'tablet',
    eq3: 'headphones',
    eq4: 'bolt',
    eq5: 'usb'
};

export function initDevolucao() {
    const lista = document.getElementById('lista-devolucoes-items');
    if (!lista) return;

    const devolucaoDataInput = document.getElementById('modal-devolucao-data');
    const btnConfirmarDevolucao = document.getElementById('btn-confirmar-devolucao');
    const devolucaoPicker = criarDataAutoPicker(devolucaoDataInput);
    let idPendente = null;

    // --- elementos do painel de detalhes ---
    const detalheEmpty = document.getElementById('devolucao-detalhe-empty');
    const detalheConteudo = document.getElementById('devolucao-detalhe-conteudo');
    const detalhePapelIcon = document.getElementById('detalhe-papel-icon');
    const detalheLista = document.getElementById('detalhe-emprestimo-lista');
    const detalheItensContagem = document.getElementById('detalhe-itens-contagem');
    const detalheEditWrap = document.getElementById('detalhe-emprestimo-edit');
    const detalheEquipamentoSelect = document.getElementById('detalhe-equipamento');
    const detalheQuantidadeInput = document.getElementById('detalhe-quantidade');
    const btnDetalheAdicionarItem = document.getElementById('btn-detalhe-adicionar-item');
    const btnDetalheEditar = document.getElementById('btn-detalhe-editar');
    const btnDetalheSalvar = document.getElementById('btn-detalhe-salvar');
    const btnDetalheFechar = document.getElementById('btn-detalhe-fechar');
    const btnDetalheCancelar = document.getElementById('btn-detalhe-cancelar');
    const btnConfirmarDevolucaoPainel = document.getElementById('btn-confirmar-devolucao-painel');

    let idDetalheAberto = null;
    let itensEditando = [];
    let modoEdicaoAtivo = false;

    render(getLoansAbertos());
    subscribe(() => render(getLoansAbertos()));

    lista.addEventListener('click', (e) => {
        const btnDevolver = e.target.closest('.devolver-btn');
        if (btnDevolver) {
            abrirModalConfirmacao(btnDevolver.dataset.id);
            return;
        }

        const card = e.target.closest('.devolucao-item');
        if (card) abrirDetalhe(card.dataset.id);
    });

    btnConfirmarDevolucao.addEventListener('click', () => {
        if (!idPendente) return;

        returnLoan(idPendente, devolucaoDataInput.value);
        showToast(`Devolução registrada para ${devolucaoDataInput.value}`, 'success');
        closeModal('modal-confirmar-devolucao');
        idPendente = null;
    });

    btnConfirmarDevolucaoPainel.addEventListener('click', () => {
        if (!idDetalheAberto) return;
        abrirModalConfirmacao(idDetalheAberto);
    });

    // --- fechar / cancelar painel ---

    btnDetalheFechar.addEventListener('click', fecharDetalhe);

    btnDetalheCancelar.addEventListener('click', () => {
        if (modoEdicaoAtivo) {
            const loan = getLoansAbertos().find((l) => l.id === idDetalheAberto);
            itensEditando = loan ? loan.itens.map((item) => ({ ...item })) : [];
            setModoEdicao(false);
            renderDetalheItens(itensEditando, false);
            return;
        }
        fecharDetalhe();
    });

    // --- editing ---

    btnDetalheEditar.addEventListener('click', () => {
        setModoEdicao(true);
        renderDetalheItens(itensEditando, true);
    });

    btnDetalheAdicionarItem.addEventListener('click', () => {
        if (!detalheEquipamentoSelect.value) {
            detalheEquipamentoSelect.reportValidity();
            return;
        }

        const quantidade = Number(detalheQuantidadeInput.value) || 1;
        const nome = detalheEquipamentoSelect.options[detalheEquipamentoSelect.selectedIndex].text;
        const existente = itensEditando.find((item) => item.id === detalheEquipamentoSelect.value);

        existente ? existente.quantidade += quantidade : itensEditando.push({ id: detalheEquipamentoSelect.value, nome, quantidade });

        renderDetalheItens(itensEditando, true);
        detalheEquipamentoSelect.value = '';
        detalheQuantidadeInput.value = 1;
    });

    detalheLista.addEventListener('click', (e) => {
        const btnRemover = e.target.closest('.detalhe-item-remover');
        if (!btnRemover) return;
        itensEditando = itensEditando.filter((item) => item.id !== btnRemover.dataset.id);
        renderDetalheItens(itensEditando, true);
    });

    detalheLista.addEventListener('change', (e) => {
        if (!e.target.classList.contains('detalhe-item-qtd')) return;
        const item = itensEditando.find((i) => i.id === e.target.dataset.id);
        if (!item) return;
        item.quantidade = Math.max(1, Number(e.target.value) || 1);
        e.target.value = item.quantidade;
    });

    btnDetalheSalvar.addEventListener('click', () => {
        if (!itensEditando.length) {
            showToast('O empréstimo precisa ter ao menos um equipamento', 'error');
            return;
        }

        updateLoan(idDetalheAberto, { itens: itensEditando });
        showToast('Empréstimo atualizado com sucesso', 'success');
        setModoEdicao(false);
        renderDetalheItens(itensEditando, false);
    });

    function abrirModalConfirmacao(id) {
        idPendente = id;
        devolucaoPicker.setDate(new Date(), false);
        devolucaoDataInput.classList.add('input-auto');
        openModal('modal-confirmar-devolucao');
    }

    function setModoEdicao(ativo) {
        modoEdicaoAtivo = ativo;
        detalheEditWrap.style.display = ativo ? 'block' : 'none';
        btnDetalheEditar.style.display = ativo ? 'none' : 'inline-flex';
        btnDetalheSalvar.style.display = ativo ? 'inline-flex' : 'none';
        btnConfirmarDevolucaoPainel.style.display = ativo ? 'none' : 'inline-flex';
        btnDetalheCancelar.textContent = ativo ? 'Cancelar edição' : 'Cancelar';
    }

    function renderDetalheItens(itens, editMode) {
        detalheItensContagem.textContent = `(${itens.length})`;

        if (!editMode) {
            detalheLista.innerHTML = itens.map((item) => `
        <li>
            <span class="material-symbols-outlined">${EQUIPAMENTO_ICONS[item.id] || 'devices_other'}</span>
            <span class="detalhe-item-nome">${item.quantidade}x ${escapeHtml(item.nome)}</span>
            <span class="detalhe-item-status">Pendente</span>
        </li>
            `).join('');
            return;
        }

        detalheLista.innerHTML = itens.map((item) => `
            <li class="detalhe-emprestimo-item-edit">
                <input type="number" min="1" class="detalhe-item-qtd" value="${item.quantidade}" data-id="${item.id}">
                <span>${escapeHtml(item.nome)}</span>
                <button type="button" class="item-emprestimo-remover detalhe-item-remover" data-id="${item.id}" aria-label="Remover">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </li>
        `).join('');
    }

    function abrirDetalhe(id) {
        const loan = getLoansAbertos().find((l) => l.id === id);
        if (!loan) return;

        idDetalheAberto = id;
        itensEditando = loan.itens.map((item) => ({ ...item }));

        document.getElementById('detalhe-emprestimo-resp').textContent = loan.responsavel;
        document.getElementById('detalhe-emprestimo-aluno').textContent = loan.aluno;
        document.getElementById('detalhe-emprestimo-data').textContent = `Empréstimo realizado em ${loan.data}`;

        setModoEdicao(false);
        renderDetalheItens(itensEditando, false);

        const obsEl = document.getElementById('detalhe-emprestimo-obs');
        if (loan.observacao) {
            obsEl.style.display = 'block';
            obsEl.innerHTML = `<span class="detalhe-emprestimo-obs-label">Observação</span><p>${escapeHtml(loan.observacao)}</p>`;
        } else {
            obsEl.style.display = 'none';
            obsEl.innerHTML = '';
        }

        detalheEmpty.style.display = 'none';
        detalheConteudo.style.display = 'flex';
        marcarLinhaSelecionada(id);
    }

    function fecharDetalhe() {
        idDetalheAberto = null;
        itensEditando = [];
        setModoEdicao(false);
        detalheConteudo.style.display = 'none';
        detalheEmpty.style.display = 'flex';
        marcarLinhaSelecionada(null);
    }

    function marcarLinhaSelecionada(id) {
        lista.querySelectorAll('.devolucao-item').forEach((el) => {
            el.classList.toggle('selected', el.dataset.id === id);
        });
    }

    function gerarIniciais(nome) {
    if (!nome) return '';
    const partes = nome.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function formatarDataCard(date) {
    const dataStr = date.toLocaleDateString('pt-BR');
    const horaStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dataStr} às ${horaStr}`;
}

function render(loans) {
    if (!loans.length) {
        lista.innerHTML = `
            <div class="devolucao-vazia">
                <img src="assets/logos/eduAssets_logo-empty-state.png" alt="" class="devolucao-vazia-logo">
                <p class="devolucao-vazia-texto">Empréstimos aparecerão aqui</p>
                <p class="devolucao-vazia-sub">Registre um novo empréstimo para começar a acompanhar as devoluções.</p>
            </div>
        `;
        fecharDetalhe();
        return;
    }

    const cabecalho = `
        <div class="devolucao-tabela-header">
            <span>Responsável</span>
            <span>Equipamentos</span>
            <span>Empréstimo</span>
            <span>Status</span>
            <span>Ações</span>
        </div>
    `;

    lista.innerHTML = cabecalho + loans.map((loan) => `
        <div class="devolucao-item" data-id="${loan.id}">
            <div class="devolucao-col-resp">
                <div class="devolucao-avatar">${gerarIniciais(loan.responsavel)}</div>
                <div class="devolucao-textos-resp">
                    <span class="info-resp-nome">${escapeHtml(loan.responsavel)}</span>
                    <span class="info-aluno-nome">${escapeHtml(loan.aluno)}</span>
                </div>
            </div>
            <div class="devolucao-col-equip">
                <div class="devolucao-itens-icons">${renderItensIcons(loan.itens)}</div>
            </div>
            <div class="devolucao-col-data">
                <span class="info-data-completa">
                    <span class="material-symbols-outlined">schedule</span>
                    ${formatarHora(loan.createdAt)}
                </span>
                ${loan.observacao ? `
                <span class="info-data-relativa">
                    <span class="material-symbols-outlined" style="font-size: 14px; opacity: 0.7;">sticky_note_2</span>
                    Com observação
                </span>
                ` : ''}
            </div>
            <div>
                <span class="status-pill">
                    <span class="status-dot"></span> Pendente
                </span>
            </div>
            <div>
                <button class="btn btn-primary btn-sm devolver-btn" data-id="${loan.id}">Devolver</button>
            </div>
        </div>
    `).join('');

    if (idDetalheAberto) {
        const aindaExiste = loans.some((l) => l.id === idDetalheAberto);
        aindaExiste ? marcarLinhaSelecionada(idDetalheAberto) : fecharDetalhe();
    }
}

function renderItensIcons(itens) {
    if (itens.length <= LIMITE_ICONES_CARD) {
        return itens.map(renderItemIconPill).join('');
    }

    const visiveis = itens.slice(0, LIMITE_ICONES_CARD - 1);
    const restantes = itens.length - visiveis.length;

    return visiveis.map(renderItemIconPill).join('') +
        `<div class="devolucao-item-icon-pill devolucao-item-icon-mais" title="+${restantes} ${restantes > 1 ? 'itens' : 'item'}">...</div>`;
}

// renderItemIconPill()
function renderItemIconPill(item) {
    const icon = EQUIPAMENTO_ICONS[item.id] || 'devices_other';
    const nome = escapeHtml(item.nome);
    return `
        <div class="devolucao-item-icon-pill" data-eq="${item.id}" title="${item.quantidade}x ${nome}">
            <span class="material-symbols-outlined">${icon}</span>
            <span class="devolucao-item-icon-pill-texto">${item.quantidade}x ${nome}</span>
        </div>
    `;
}

function formatarHora(date) {
    const hoje = new Date();
    const mesmoDia = date.toDateString() === hoje.toDateString();
    const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return mesmoDia ? `Hoje às ${hora}` : `${date.toLocaleDateString('pt-BR')} às ${hora}`;
}}