import { html } from '../../core/utils/html.js';

export function renderOpcaoSubtipo(subtipo) {
    return html`<option value="${subtipo.value}">${subtipo.label}</option>`;
}

export function renderOpcaoEquipamentoFiltro(equipamento) {
    return html`<option value="${equipamento.id}">${equipamento.modelo} — ${equipamento.categoria?.nome ?? ''}</option>`;
}