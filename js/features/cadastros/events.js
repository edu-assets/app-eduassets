import { closeModal, showToast } from '../../core/ui/index.js';
import { getConfig, listarRegistros, criarRegistro, carregarOpcoesCampo, formatarItem } from './service.js';
import {
    abrirModalCadastro,
    exibirListaCarregando,
    exibirListaErro,
    renderListaRegistros,
    limparCamposFormulario
} from './render.js';

export function attachCadastrosEvents(els, estado) {
    els.cards.forEach((card) => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            abrirCadastro(els, estado, card.dataset.cadastro);
        });
    });

    if (els.btnCancelar) {
        els.btnCancelar.addEventListener('click', () => closeModal('modal-cadastro'));
    }

    if (els.btnSalvar) {
        els.btnSalvar.addEventListener('click', () => salvarRegistro(els, estado));
    }
}

async function abrirCadastro(els, estado, tipo) {
    const config = getConfig(tipo);
    if (!config) return;

    estado.tipoAtual = tipo;

    let camposComOpcoes;
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

async function recarregarLista(els, estado) {
    exibirListaCarregando(els);

    try {
        const itens = await listarRegistros(estado.tipoAtual);
        renderListaRegistros(els, itens.map((item) => formatarItem(estado.tipoAtual, item)));
    } catch (erro) {
        exibirListaErro(els);
        showToast(erro.message, 'error');
    }
}

async function salvarRegistro(els, estado) {
    const config = getConfig(estado.tipoAtual);
    if (!config) return;

    const valores = {};
    config.campos.forEach((campo) => {
        const el = document.getElementById(campo.id);
        valores[campo.id] = el ? el.value.trim() : '';
    });

    const temCampoVazio = config.campos.some((campo) => !valores[campo.id]);
    if (temCampoVazio) {
        showToast('Preencha todos os campos antes de salvar.', 'warning');
        return;
    }

    els.btnSalvar.disabled = true;
    try {
        await criarRegistro(estado.tipoAtual, valores);
        showToast('Registro criado com sucesso', 'success');
        limparCamposFormulario(config.campos);
        await recarregarLista(els, estado);
    } catch (erro) {
        showToast(erro.message, 'error');
    } finally {
        els.btnSalvar.disabled = false;
    }
}