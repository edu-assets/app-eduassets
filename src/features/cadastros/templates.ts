import { html, raw } from '../../core/utils/html.js';
import { renderEmptyState } from '../../shared/components/emptyState.js';
import { gerarIniciais } from '../../core/utils/iniciais.js';
import type { CampoCadastro, CampoOpcao } from './service.js';
import type { Usuario } from '../../types/index.js';

export function renderCampo(campo: CampoCadastro, opcoes: CampoOpcao[] | null): string {
    return campo.type === 'select' ? renderCampoSelect(campo, opcoes || []) : renderCampoTexto(campo);
}

function renderCampoTexto(campo: CampoCadastro): string {
    return html`
        <div class="form-group">
            <label for="${campo.id}">${campo.label}</label>
            <input type="${campo.type}" id="${campo.id}" placeholder="${campo.placeholder || ''}">
        </div>
    `;
}

function renderCampoSelect(campo: CampoCadastro, opcoes: CampoOpcao[]): string {
    const opcoesHtml = opcoes.map((op) => html`<option value="${op.value}">${op.label}</option>`).join('');

    return html`
        <div class="form-group">
            <label for="${campo.id}">${campo.label}</label>
            <select id="${campo.id}">
                <option value="" disabled selected hidden>Selecionar</option>
                ${raw(opcoesHtml)}
            </select>
        </div>
    `;
}

export function renderItemRegistro(texto: string): string {
    return html`<div class="cadastro-modal-item">${texto}</div>`;
}

const NIVEL_LABEL: Record<string, string> = {
    ADMINISTRADOR: 'Administrador',
    EDITOR: 'Editor'
};

export function renderItemRegistroUsuario(usuario: Usuario): string {
    const chip = usuario.possuiCartaoRfid
        ? html`<button type="button" class="cadastro-rfid-chip cadastro-rfid-chip--vinculado" data-rfid-usuario-id="${usuario.id}">
                <span class="material-symbols-outlined">contactless</span>Cartão vinculado
            </button>`
        : html`<button type="button" class="cadastro-rfid-chip" data-rfid-usuario-id="${usuario.id}">
                <span class="material-symbols-outlined">add_card</span>Vincular cartão
            </button>`;

    return html`
        <div class="cadastro-usuario-row">
            <span class="cadastro-usuario-avatar">${gerarIniciais(usuario.nome)}</span>
            <div class="cadastro-usuario-info">
                <span class="cadastro-usuario-nome">${usuario.nome}</span>
                <span class="cadastro-usuario-meta">${usuario.login} · ${NIVEL_LABEL[usuario.nivelAcesso] ?? usuario.nivelAcesso}</span>
            </div>
            ${raw(chip)}
        </div>
    `;
}

export function renderListaVazia(): string {
    return renderEmptyState({
        containerClass: 'cadastro-modal-empty',
        titulo: 'Nenhum registro cadastrado.',
        tituloTag: null
    });
}

export function renderListaCarregando(): string {
    return html`<div class="cadastro-modal-empty">Carregando...</div>`;
}

export function renderListaErro(): string {
    return html`<div class="cadastro-modal-empty">Não foi possível carregar os registros.</div>`;
}