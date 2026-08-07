import { html, raw } from '../../core/utils/html.js';
import { renderEmptyState } from '../../shared/components/emptyState.js';
import type { CampoCadastro, CampoOpcao } from './service.js';

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