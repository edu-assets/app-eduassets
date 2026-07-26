import { closeModal, showToast, confirmarExclusao } from '../../core/ui/index.js';
import {
    ativarAba,
    fecharTodosMenus,
    selecionarLinha,
    limparSelecao,
    abrirNovoRegistro,
    abrirEdicaoRegistro
} from './render.js';
import { adicionarRegistro, editarRegistro, removerRegistro } from './service.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';

export function attachControleEvents(els, estado) {
    document.querySelectorAll('.controle-tab-link').forEach((tabLink) => {
        tabLink.addEventListener('click', () => ativarAba(els, estado, tabLink.dataset.controleTab));
    });

    document.querySelectorAll('.controle-resumo-card').forEach((card) => {
        card.addEventListener('click', () => ativarAba(els, estado, card.dataset.controleTab));
    });

    if (els.btnNovo && els.menuNovo) {
        els.btnNovo.addEventListener('click', (e) => {
            e.stopPropagation();
            if (bloquearSeConvidado()) return;
            els.menuNovo.classList.toggle('active');
        });

        els.menuNovo.querySelectorAll('.novo-registro-opcao').forEach((opcao) => {
            opcao.addEventListener('click', () => {
                els.menuNovo.classList.remove('active');
                abrirNovoRegistro(els, estado, opcao.dataset.tipo);
            });
        });
    }

    document.addEventListener('click', (e) => {
        if (els.menuNovo && !els.menuNovo.contains(e.target) && e.target !== els.btnNovo) {
            els.menuNovo.classList.remove('active');
        }
        fecharTodosMenus(e.target);
    });

    if (els.btnModalCancelar) {
        els.btnModalCancelar.addEventListener('click', () => {
            estado.idEditando = null;
            estado.linhaEditando = null;
            closeModal('modal-controle-novo');
        });
    }

    if (els.btnModalSalvar) {
        els.btnModalSalvar.addEventListener('click', () => salvarModal(els, estado));
    }

    els.registrosContainer.addEventListener('click', (e) => {
        const menuBtn = e.target.closest('.registros-row-menu-btn');
        if (menuBtn) {
            e.stopPropagation();
            const menu = menuBtn.nextElementSibling;
            const jaAberto = menu.classList.contains('active');
            fecharTodosMenus();
            if (!jaAberto) menu.classList.add('active');
            return;
        }

        const opcaoMenu = e.target.closest('.registros-row-menu-opcao');
        if (opcaoMenu) {
            const row = opcaoMenu.closest('.registros-row');
            fecharTodosMenus();

            if (opcaoMenu.dataset.acao === 'excluir') {
                excluirRegistro(els, estado, row);
            } else {
                selecionarLinha(els, estado, row);
                abrirEdicaoRegistro(els, estado, row);
            }
            return;
        }

        const row = e.target.closest('.registros-row');
        if (!row) return;

        if (estado.linhaSelecionada === row) {
            limparSelecao(els, estado);
            return;
        }

        selecionarLinha(els, estado, row);
    });

    if (els.btnEditar) {
        els.btnEditar.addEventListener('click', () => {
            if (!estado.linhaSelecionada) return;
            abrirEdicaoRegistro(els, estado, estado.linhaSelecionada);
        });
    }

    if (els.btnDeletar) {
        els.btnDeletar.addEventListener('click', () => excluirRegistro(els, estado, estado.linhaSelecionada));
    }
}

async function salvarModal(els, estado) {
    if (bloquearSeConvidado()) return;
    if (!estado.tipoAtual) return;

    if (!els.campoCategoria.value || !els.campoModelo.value || !els.campoNumero.value || !els.campoProblema.value) {
        els.campoProblema.reportValidity?.();
        return;
    }

    if (estado.tipoAtual === 'resolvidos' && !els.campoMedidas.value.trim()) {
        showToast('Descreva as medidas tomadas antes de salvar', 'warning');
        els.campoMedidas.focus();
        return;
    }

    const dados = {
        categoria: els.campoCategoria.value,
        modelo: els.campoModelo.value,
        numero: els.campoNumero.value,
        problema: els.campoProblema.value,
        descricao: els.campoDescricao.value || '—',
        medidas: estado.tipoAtual === 'resolvidos' ? els.campoMedidas.value : undefined
    };

    try {
        if (estado.idEditando) {
            await editarRegistro(estado.idEditando, estado.tipoAtual, dados);
            showToast('Registro atualizado com sucesso', 'success');
        } else {
            await adicionarRegistro(estado.tipoAtual, dados);
            showToast('Registro criado com sucesso', 'success');
        }
    } catch (erro) {
        showToast(erro instanceof Error ? erro.message : 'Erro ao salvar registro.', 'error');
        return;
    }

    closeModal('modal-controle-novo');
    estado.idEditando = null;
    estado.linhaEditando = null;
}

async function excluirRegistro(els, estado, row) {
    if (!row) return;
    if (bloquearSeConvidado()) return;

    const confirmado = await confirmarExclusao({
        titulo: 'Excluir registro',
        mensagem: 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.'
    });
    if (!confirmado) return;

    if (row === estado.linhaSelecionada) limparSelecao(els, estado);

    try {
        await removerRegistro(row.dataset.id);
        showToast('Registro excluído com sucesso', 'success');
    } catch (erro) {
        showToast(erro instanceof Error ? erro.message : 'Erro ao excluir registro.', 'error');
    }
}