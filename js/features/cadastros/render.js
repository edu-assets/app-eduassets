import { openModal } from '../../core/ui/index.js';
import {
    renderCampo,
    renderItemRegistro,
    renderListaVazia,
    renderListaCarregando,
    renderListaErro
} from './templates.js';

function agruparCamposEmLinhas(camposComOpcoes) {
    const linhas = [];
    for (let i = 0; i < camposComOpcoes.length; i += 2) {
        linhas.push(camposComOpcoes.slice(i, i + 2));
    }
    return linhas;
}

export function abrirModalCadastro(els, config, camposComOpcoes) {
    els.titulo.textContent = config.titulo;

    if (els.subtitulo) els.subtitulo.textContent = config.descricao || '';
    if (els.headerIcone) els.headerIcone.className = `modal-header-icon modal-header-icon-${config.iconeClasse || 'primary'}`;
    if (els.headerIconeSymbol) els.headerIconeSymbol.textContent = config.icone || 'list_alt';

    els.camposWrap.innerHTML = agruparCamposEmLinhas(camposComOpcoes)
        .map((linha) => {
            const camposHtml = linha.map(({ campo, opcoes }) => renderCampo(campo, opcoes)).join('');
            return linha.length > 1 ? `<div class="form-row">${camposHtml}</div>` : camposHtml;
        })
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