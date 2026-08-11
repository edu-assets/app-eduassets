import { closeModal, showToast } from '../../core/ui/index.js';
import { getConfig, listarRegistros, criarRegistro, carregarOpcoesCampo, formatarItem } from './service.js';
import {
    abrirModalCadastro,
    exibirListaCarregando,
    exibirListaErro,
    renderListaRegistros,
    limparCamposFormulario
} from './render.js';
import { bloquearSeNaoAdmin } from '../../core/auth/guestGate.js';
import type { CampoComOpcoes } from './render.js';

export interface CadastrosEls {
    cards: NodeListOf<HTMLElement>;
    titulo: HTMLElement;
    subtitulo: HTMLElement | null;
    headerIcone: HTMLElement | null;
    headerIconeSymbol: HTMLElement | null;
    camposWrap: HTMLElement;
    listaWrap: HTMLElement;
    btnCancelar: HTMLElement | null;
    btnSalvar: HTMLButtonElement | null;
}

export interface CadastrosEstado {
    tipoAtual: string | null;
}

export function attachCadastrosEvents(els: CadastrosEls, estado: CadastrosEstado): void {
    els.cards.forEach((card) => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            if (bloquearSeNaoAdmin('Cadastros disponível apenas para administradores.')) return;
            abrirCadastro(els, estado, card.dataset.cadastro ?? null);
        });
    });

    if (els.btnCancelar) {
        els.btnCancelar.addEventListener('click', () => closeModal('modal-cadastro'));
    }

    if (els.btnSalvar) {
        els.btnSalvar.addEventListener('click', () => salvarRegistro(els, estado));
    }
}

async function abrirCadastro(els: CadastrosEls, estado: CadastrosEstado, tipo: string | null): Promise<void> {
    const config = getConfig(tipo);
    if (!config) return;

    estado.tipoAtual = tipo;

    let camposComOpcoes: CampoComOpcoes[];
    try {
        camposComOpcoes = await Promise.all(
            config.campos.map(async (campo) => ({ campo, opcoes: await carregarOpcoesCampo(campo) }))
        );
    } catch {
        showToast('Não foi possível carregar os dados do formulário.', 'error');
        return;
    }

    abrirModalCadastro(els, config, camposComOpcoes);
    await recarregarLista(els, estado);
}

async function recarregarLista(els: CadastrosEls, estado: CadastrosEstado): Promise<void> {
    exibirListaCarregando(els);

    try {
        const itens = await listarRegistros(estado.tipoAtual);
        renderListaRegistros(els, itens.map((item) => formatarItem(estado.tipoAtual, item)));
    } catch (erro) {
        exibirListaErro(els);
        showToast(erro instanceof Error ? erro.message : 'Erro ao carregar registros.', 'error');
    }
}

async function salvarRegistro(els: CadastrosEls, estado: CadastrosEstado): Promise<void> {
    if (bloquearSeNaoAdmin('Salvamento de registros disponível apenas para administradores.')) return;
    const config = getConfig(estado.tipoAtual);
    if (!config) return;

    const valores: Record<string, string> = {};
    config.campos.forEach((campo) => {
        const el = document.getElementById(campo.id) as HTMLInputElement | HTMLSelectElement | null;
        valores[campo.id] = el ? el.value.trim() : '';
    });

    const temCampoVazio = config.campos.some((campo) => !valores[campo.id]);
    if (temCampoVazio) {
        showToast('Preencha todos os campos antes de salvar.', 'warning');
        return;
    }

    if (els.btnSalvar) els.btnSalvar.disabled = true;
    try {
        await criarRegistro(estado.tipoAtual, valores);
        showToast('Registro criado com sucesso', 'success');
        limparCamposFormulario(config.campos);
        await recarregarLista(els, estado);
    } catch (erro) {
        showToast(erro instanceof Error ? erro.message : 'Erro ao salvar registro.', 'error');
    } finally {
        if (els.btnSalvar) els.btnSalvar.disabled = false;
    }
}