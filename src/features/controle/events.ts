import { closeModal, showToast, confirmarExclusao } from '../../core/ui/index.js';
import {
    ativarAba,
    fecharTodosMenus,
    selecionarLinha,
    limparSelecao,
    abrirNovoRegistro,
    abrirEdicaoRegistro,
    abrirResolverRegistro,
    popularSelectModelos
} from './render.js';
import type { ControleEls, ControleEstado } from './render.js';
import { adicionarRegistro, editarRegistro, removerRegistro, resolverRegistro } from './service.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';
import { formatarErroEstoque } from '../../core/utils/erroEstoque.js';
import type { ControleRegistroDados } from '../../types/index.js';

export function attachControleEvents(els: ControleEls, estado: ControleEstado): void {
    document.querySelectorAll<HTMLElement>('.controle-tab-link').forEach((tabLink) => {
        tabLink.addEventListener('click', () => ativarAba(els, estado, tabLink.dataset.controleTab ?? ''));
    });

    document.querySelectorAll<HTMLElement>('.controle-resumo-card').forEach((card) => {
        card.addEventListener('click', () => ativarAba(els, estado, card.dataset.controleTab ?? ''));
    });

    if (els.btnNovo && els.menuNovo) {
        const btnNovo = els.btnNovo;
        const menuNovo = els.menuNovo;

        btnNovo.addEventListener('click', (e) => {
            e.stopPropagation();
            if (bloquearSeConvidado()) return;
            menuNovo.classList.toggle('active');
        });

        menuNovo.querySelectorAll<HTMLElement>('.novo-registro-opcao').forEach((opcao) => {
            opcao.addEventListener('click', () => {
                menuNovo.classList.remove('active');
                abrirNovoRegistro(els, estado, opcao.dataset.tipo ?? '');
            });
        });
    }

    document.addEventListener('click', (e) => {
        const target = e.target as Node;
        if (els.menuNovo && !els.menuNovo.contains(target) && target !== els.btnNovo) {
            els.menuNovo.classList.remove('active');
        }
        fecharTodosMenus(target as Element);
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

    if (els.campoCategoria) {
        els.campoCategoria.addEventListener('change', () => {
            popularSelectModelos(els, els.campoCategoria.value);
        });
    }

    els.registrosContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        const menuBtn = target.closest<HTMLElement>('.registros-row-menu-btn');
        if (menuBtn) {
            e.stopPropagation();
            const menu = menuBtn.nextElementSibling as HTMLElement | null;
            if (!menu) return;
            const jaAberto = menu.classList.contains('active');
            fecharTodosMenus();
            if (!jaAberto) menu.classList.add('active');
            return;
        }

        const opcaoMenu = target.closest<HTMLElement>('.registros-row-menu-opcao');
        if (opcaoMenu) {
            const row = opcaoMenu.closest<HTMLElement>('.registros-row');
            fecharTodosMenus();
            if (!row) return;

            if (opcaoMenu.dataset.acao === 'excluir') {
                excluirRegistro(els, estado, row);
            } else if (opcaoMenu.dataset.acao === 'resolver') {
                if (bloquearSeConvidado()) return;
                selecionarLinha(els, estado, row);
                abrirResolverRegistro(els, estado, row);
            } else {
                selecionarLinha(els, estado, row);
                abrirEdicaoRegistro(els, estado, row);
            }
            return;
        }

        const row = target.closest<HTMLElement>('.registros-row');
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

    if (els.btnResolver) {
        els.btnResolver.addEventListener('click', () => {
            if (!estado.linhaSelecionada) return;
            if (bloquearSeConvidado()) return;
            abrirResolverRegistro(els, estado, estado.linhaSelecionada);
        });
    }

    if (els.btnResolverCancelar) {
        els.btnResolverCancelar.addEventListener('click', () => {
            estado.idResolvendo = null;
            closeModal('modal-controle-resolver');
        });
    }

    if (els.btnResolverConfirmar) {
        els.btnResolverConfirmar.addEventListener('click', () => salvarResolucao(els, estado));
    }
}

async function salvarModal(els: ControleEls, estado: ControleEstado): Promise<void> {
    if (bloquearSeConvidado()) return;
    if (!estado.tipoAtual) return;

    if (!els.campoCategoria.value || !els.campoModelo.value || !els.campoNumero.value || !els.campoProblema.value) {
        els.campoProblema.reportValidity?.();
        return;
    }

    if (estado.tipoAtual === 'resolvidos' && !els.campoMedidas?.value.trim()) {
        showToast('Descreva as medidas tomadas antes de salvar', 'warning');
        els.campoMedidas?.focus();
        return;
    }

    const dados: ControleRegistroDados = {
        categoria: els.campoCategoria.value,
        modelo: els.campoModelo.value,
        numero: els.campoNumero.value,
        problema: els.campoProblema.value,
        descricao: els.campoDescricao.value || '—',
        medidas: estado.tipoAtual === 'resolvidos' ? els.campoMedidas?.value : undefined
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
        showToast(formatarErroEstoque(erro, 'Erro ao salvar registro.'), 'error');
        return;
    }

    closeModal('modal-controle-novo');
    estado.idEditando = null;
    estado.linhaEditando = null;
}

async function salvarResolucao(els: ControleEls, estado: ControleEstado): Promise<void> {
    if (bloquearSeConvidado()) return;
    if (!estado.idResolvendo) return;

    const medidas = els.resolverMedidas?.value.trim();
    if (!medidas) {
        showToast('Descreva as medidas tomadas antes de confirmar', 'warning');
        els.resolverMedidas?.focus();
        return;
    }

    try {
        await resolverRegistro(estado.idResolvendo, medidas);
        showToast('Registro marcado como resolvido', 'success');
    } catch (erro) {
        showToast(erro instanceof Error ? erro.message : 'Erro ao resolver registro.', 'error');
        return;
    }

    closeModal('modal-controle-resolver');
    estado.idResolvendo = null;
}

async function excluirRegistro(els: ControleEls, estado: ControleEstado, row: HTMLElement | null): Promise<void> {
    if (!row) return;
    if (bloquearSeConvidado()) return;

    const confirmado = await confirmarExclusao({
        titulo: 'Excluir registro',
        mensagem: 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.'
    });
    if (!confirmado) return;

    if (row === estado.linhaSelecionada) limparSelecao(els, estado);

    try {
        await removerRegistro(row.dataset.id ?? '');
        showToast('Registro excluído com sucesso', 'success');
    } catch (erro) {
        showToast(erro instanceof Error ? erro.message : 'Erro ao excluir registro.', 'error');
    }
}