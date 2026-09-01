import { openModal, closeModal } from '../../core/ui/index.js';
import { gerarIniciais } from '../../core/utils/iniciais.js';
import {
    renderCampo,
    renderItemRegistro,
    renderItemRegistroUsuario,
    renderListaVazia,
    renderListaCarregando,
    renderListaErro
} from './templates.js';
import type { CadastroConfig, CampoCadastro, CampoOpcao } from './service.js';
import type { Usuario } from '../../types/index.js';
import { t } from '../../core/state/i18nStore.js';

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

export interface RfidModalEls {
    overlay: HTMLElement;
    avatar: HTMLElement;
    nome: HTMLElement;
    login: HTMLElement;
    estadoVazio: HTMLElement;
    estadoToken: HTMLElement;
    estadoGravacao: HTMLElement;
    estadoVinculado: HTMLElement;
    tokenValor: HTMLElement;
    btnGerar: HTMLButtonElement;
    btnRegerar: HTMLButtonElement;
    btnRevogar: HTMLButtonElement;
    btnCopiar: HTMLButtonElement;
    btnFechar: HTMLElement;
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

export function renderListaUsuarios(els: CadastroListaEls, usuarios: Usuario[]): void {
    els.listaWrap.innerHTML = usuarios.length
        ? usuarios.map(renderItemRegistroUsuario).join('')
        : renderListaVazia();
}

export function limparCamposFormulario(campos: CampoCadastro[]): void {
    campos.forEach((campo) => {
        const el = document.getElementById(campo.id) as HTMLInputElement | HTMLSelectElement | null;
        if (el) el.value = '';
    });
}

/* ===== Modal Cartão RFID ===== */

type EstadoRfid = 'vazio' | 'token' | 'gravacao' | 'vinculado';

function mostrarEstadoRfid(els: RfidModalEls, estado: EstadoRfid): void {
    els.estadoVazio.style.display = estado === 'vazio' ? 'flex' : 'none';
    els.estadoToken.style.display = estado === 'token' ? 'flex' : 'none';
    els.estadoGravacao.style.display = estado === 'gravacao' ? 'flex' : 'none';
    els.estadoVinculado.style.display = estado === 'vinculado' ? 'flex' : 'none';
}

export function abrirModalRfid(els: RfidModalEls, usuario: Usuario): void {
    els.avatar.textContent = gerarIniciais(usuario.nome);
    els.nome.textContent = usuario.nome;
    els.login.textContent = usuario.login;

    mostrarEstadoRfid(els, usuario.possuiCartaoRfid ? 'vinculado' : 'vazio');
    openModal('modal-cadastro-rfid');
}

export function exibirModoGravacao(els: RfidModalEls): void {
    mostrarEstadoRfid(els, 'gravacao');
}

export function exibirCartaoRevogado(els: RfidModalEls): void {
    mostrarEstadoRfid(els, 'vazio');
}

export function fecharModalRfid(): void {
    closeModal('modal-cadastro-rfid');
}