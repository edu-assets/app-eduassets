import { openModal } from '../../core/ui/index.js';
import {
    renderCampo,
    renderItemRegistro,
    renderListaVazia,
    renderListaCarregando,
    renderListaErro
} from './templates.js';

export function abrirModalCadastro(els, config, camposComOpcoes) {
    els.titulo.textContent = config.titulo;
    els.camposWrap.innerHTML = camposComOpcoes
        .map(({ campo, opcoes }) => renderCampo(campo, opcoes))
        .join('');

    openModal('modal-cadastro');
}

export function exibirListaCarregando(els) {
    els.listaWrap.innerHTML = renderListaCarregando();
}

export function exibirListaErro(els) {
    els.listaWrap.innerHTML = renderListaErro();
}

export function renderListaRegistros(els, itensTexto) {
    els.listaWrap.innerHTML = itensTexto.length
        ? itensTexto.map(renderItemRegistro).join('')
        : renderListaVazia();
}

export function limparCamposFormulario(campos) {
    campos.forEach((campo) => {
        const el = document.getElementById(campo.id);
        if (el) el.value = '';
    });
}