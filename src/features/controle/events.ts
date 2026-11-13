import { closeModal, showToast, confirmarExclusao } from '../../core/ui/index.js';
import {
    ativarAba,
    fecharTodosMenus,
    selecionarLinha,
    limparSelecao,
    atualizarToolbar,
    abrirNovoRegistro,
    abrirEdicaoRegistro,
    abrirResolverRegistro,
    popularSelectModelos
} from './render.js';
import type { ControleEls, ControleEstado } from './render.js';
import { adicionarRegistro, editarRegistro, removerRegistro, resolverRegistro } from './service.js';
import { renderDetalhesExclusao } from './templates.js';
import { bloquearSeConvidado, bloquearSeNaoAdmin } from '../../core/auth/guestGate.js';
import { formatarErroEstoque } from '../../core/utils/erroEstoque.js';
import type { ControleRegistroDados } from '../../types/index.js';
import { traduzirErro } from '../../core/state/i18nStore.js';
import { setButtonLoading } from '../../shared/dom/buttonLoading.js';
import { attachTablistKeyboard } from '../../shared/dom/tabs.js';
import { abrirDocumentacao } from '../sobre/index.js';
import { attachLimpezaErros, validarModal } from './validacao.js';

const SELETOR_ITEM_MENU = '[role="menuitem"]:not(:disabled)';

let salvandoModal = false;
let resolvendoRegistro = false;
let excluindoRegistro = false;

function abrirMenu(trigger: HTMLElement | null, menu: HTMLElement): void {
    menu.classList.add('active');
    trigger?.setAttribute('aria-expanded', 'true');
}

function fecharMenu(trigger: HTMLElement | null, menu: HTMLElement): void {
    menu.classList.remove('active');
    trigger?.setAttribute('aria-expanded', 'false');
}

function focarPrimeiroItem(menu: HTMLElement): void {
    menu.querySelector<HTMLElement>(SELETOR_ITEM_MENU)?.focus();
}

function gatilhoDoMenu(els: ControleEls, menu: HTMLElement): HTMLElement | null {
    return menu === els.menuNovo ? els.btnNovo : (menu.previousElementSibling as HTMLElement | null);
}

function attachTecladoMenus(els: ControleEls): void {
    document.addEventListener('keydown', (e) => {
        const aberto = document.querySelector<HTMLElement>('.novo-registro-menu.active, .registros-row-menu.active');
        if (!aberto) return;
        const gatilho = gatilhoDoMenu(els, aberto);

        if (e.key === 'Escape') {
            e.preventDefault();
            fecharMenu(gatilho, aberto);
            gatilho?.focus();
            return;
        }

        if (e.key === 'Tab') {
            fecharMenu(gatilho, aberto);
            return;
        }

        if (!aberto.contains(e.target as Node)) return;
        const itens = Array.from(aberto.querySelectorAll<HTMLElement>(SELETOR_ITEM_MENU));
        const indice = itens.indexOf(e.target as HTMLElement);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            itens[(indice + 1) % itens.length]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            itens[(indice - 1 + itens.length) % itens.length]?.focus();
        } else if (e.key === 'Home') {
            e.preventDefault();
            itens[0]?.focus();
        } else if (e.key === 'End') {
            e.preventDefault();
            itens[itens.length - 1]?.focus();
        }
    });
}

export function attachControleEvents(els: ControleEls, estado: ControleEstado): void {
    const tablist = document.querySelector<HTMLElement>('.controle-tabs');
    if (tablist) attachTablistKeyboard(tablist, '.controle-tab-link');
    attachTecladoMenus(els);
    attachLimpezaErros(els);
    document.getElementById('controle-btn-saiba-mais')?.addEventListener('click', () => abrirDocumentacao('manual-usuario'));

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
            if (menuNovo.classList.contains('active')) {
                fecharMenu(btnNovo, menuNovo);
                return;
            }
            abrirMenu(btnNovo, menuNovo);
            focarPrimeiroItem(menuNovo);
        });

        menuNovo.querySelectorAll<HTMLElement>('.novo-registro-opcao').forEach((opcao) => {
            opcao.addEventListener('click', () => {
                fecharMenu(btnNovo, menuNovo);
                abrirNovoRegistro(els, estado, opcao.dataset.tipo ?? '');
            });
        });
    }

    document.addEventListener('click', (e) => {
        const target = e.target as Node;
        if (els.menuNovo && !els.menuNovo.contains(target) && target !== els.btnNovo) {
            fecharMenu(els.btnNovo, els.menuNovo);
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
            if (!jaAberto) {
                abrirMenu(menuBtn, menu);
                focarPrimeiroItem(menu);
            }
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
    if (salvandoModal) return;
    if (bloquearSeConvidado()) return;
    if (!estado.tipoAtual) return;

    if (!validarModal(els)) return;

    if (estado.tipoAtual === 'resolvidos' && !els.campoMedidas?.value.trim()) {
        showToast('Descreva as medidas tomadas antes de salvar', 'warning');
        els.campoMedidas?.focus();
        return;
    }

    const nomeModelo = els.campoModelo.selectedOptions[0]?.textContent ?? '';

    const dados: ControleRegistroDados = {
        categoria: els.campoCategoria.value,
        modelo: nomeModelo,
        equipamentoId: els.campoModelo.value,
        numero: els.campoNumero.value,
        problema: els.campoProblema.value,
        descricao: els.campoDescricao.value || '—',
        medidas: estado.tipoAtual === 'resolvidos' ? els.campoMedidas?.value : undefined
    };

    salvandoModal = true;
    setButtonLoading(els.btnModalSalvar, true);
    try {
        if (estado.idEditando) {
            await editarRegistro(estado.idEditando, estado.tipoAtual, dados);
            showToast('Registro atualizado com sucesso', 'success');
        } else {
            await adicionarRegistro(estado.tipoAtual, dados);
            showToast('Registro criado com sucesso', 'success');
        }
    } catch (erro) {
        showToast(formatarErroEstoque(erro, 'feedback.erro_salvar_registro'), 'error');
        return;
    } finally {
        setButtonLoading(els.btnModalSalvar, false);
        salvandoModal = false;
    }

    closeModal('modal-controle-novo');
    estado.idEditando = null;
    estado.linhaEditando = null;
}

async function salvarResolucao(els: ControleEls, estado: ControleEstado): Promise<void> {
    if (resolvendoRegistro) return;
    if (bloquearSeConvidado()) return;
    if (!estado.idResolvendo) return;

    const medidas = els.resolverMedidas?.value.trim();
    if (!medidas) {
        showToast('Descreva as medidas tomadas antes de confirmar', 'warning');
        els.resolverMedidas?.focus();
        return;
    }

    resolvendoRegistro = true;
    setButtonLoading(els.btnResolverConfirmar, true);
    try {
        await resolverRegistro(estado.idResolvendo, medidas);
        showToast('Registro marcado como resolvido', 'success');
    } catch (erro) {
        showToast(traduzirErro(erro, 'feedback.erro_resolver_registro'), 'error');
        return;
    } finally {
        setButtonLoading(els.btnResolverConfirmar, false);
        resolvendoRegistro = false;
    }

    closeModal('modal-controle-resolver');
    estado.idResolvendo = null;
}

async function excluirRegistro(els: ControleEls, estado: ControleEstado, row: HTMLElement | null): Promise<void> {
    if (!row) return;
    if (excluindoRegistro) return;
    if (bloquearSeNaoAdmin()) return;

    excluindoRegistro = true;
    try {
        const detalhesHtml = renderDetalhesExclusao({
            categoria: row.dataset.categoria || '',
            modelo: row.dataset.modelo || '',
            numero: row.dataset.numero || '',
            descricao: row.dataset.descricao || ''
        });

        const confirmado = await confirmarExclusao({
            titulo: 'Excluir registro',
            mensagem: 'Esta ação não pode ser desfeita.',
            detalhesHtml,
            textoAtencao: 'Ao excluir este registro, todas as informações relacionadas serão removidas permanentemente do sistema.'
        });

        if (!confirmado) return;

        if (row === estado.linhaSelecionada) limparSelecao(els, estado);

        setButtonLoading(els.btnDeletar, true);
        try {
            await removerRegistro(row.dataset.id ?? '');
            showToast('Registro excluído com sucesso', 'success');
        } catch (erro) {
            showToast(traduzirErro(erro, 'feedback.erro_excluir_registro'), 'error');
        } finally {
            setButtonLoading(els.btnDeletar, false);
            atualizarToolbar(els, estado);
        }
    } finally {
        excluindoRegistro = false;
    }
}
