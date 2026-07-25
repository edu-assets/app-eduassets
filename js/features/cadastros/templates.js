import { html, raw } from '../../core/utils/html.js';

export function renderCampo(campo, opcoes) {
    return campo.type === 'select' ? renderCampoSelect(campo, opcoes || []) : renderCampoTexto(campo);
}

function renderCampoTexto(campo) {
    return html`
        <div class="form-group">
            <label for="${campo.id}">${campo.label}</label>
            <input type="${campo.type}" id="${campo.id}" placeholder="${campo.placeholder || ''}">
        </div>
    `;
}

function renderCampoSelect(campo, opcoes) {
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

export function renderItemRegistro(texto) {
    return html`<div class="cadastro-modal-item">${texto}</div>`;
}

export function renderListaVazia() {
    return html`<div class="cadastro-modal-empty">Nenhum registro cadastrado.</div>`;
}

export function renderListaCarregando() {
    return html`<div class="cadastro-modal-empty">Carregando...</div>`;
}

export function renderListaErro() {
    return html`<div class="cadastro-modal-empty">Não foi possível carregar os registros.</div>`;
}