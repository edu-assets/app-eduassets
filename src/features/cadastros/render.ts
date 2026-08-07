import { openModal } from '../../core/ui/index.js';
import {
    renderCampo,
    renderItemRegistro,
    renderListaVazia,
    renderListaCarregando,
    renderListaErro
} from './templates.js';
import type { CadastroConfig, CampoCadastro, CampoOpcao } from './service.js';

export interface CampoComOpcoes {
    campo: CampoCadastro;
    opcoes: CampoOpcao[] | null;
}

export interface CadastroModalEls {
    titulo: HTMLElement;
    subtitulo: HTMLElement | null;
    headerIcone: HTMLElement | null;
    headerIconeSymbol: HTMLElement | null;
    camposWrap: HTMLElement;
}

export interface CadastroListaEls {
    listaWrap: HTMLElement;
}

function agruparCamposEmLinhas(camposComOpcoes: CampoComOpcoes[]): CampoComOpcoes[][] {
    const linhas: CampoComOpcoes[][] = [];
    for (let i = 0; i < camposComOpcoes.length; i += 2) {
        linhas.push(camposComOpcoes.slice(i, i + 2));
    }
    return linhas;
}

export function abrirModalCadastro(
    els: CadastroModalEls,
    config: CadastroConfig,
    camposComOpcoes: CampoComOpcoes[]
): void {
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

export function exibirListaCarregando(els: CadastroListaEls): void {
    els.listaWrap.innerHTML = renderListaCarregando();
}

export function exibirListaErro(els: CadastroListaEls): void {
    els.listaWrap.innerHTML = renderListaErro();
}

export function renderListaRegistros(els: CadastroListaEls, itensTexto: string[]): void {
    els.listaWrap.innerHTML = itensTexto.length
        ? itensTexto.map(renderItemRegistro).join('')
        : renderListaVazia();
}

export function limparCamposFormulario(campos: CampoCadastro[]): void {
    campos.forEach((campo) => {
        const el = document.getElementById(campo.id) as HTMLInputElement | HTMLSelectElement | null;
        if (el) el.value = '';
    });
}