import { html } from '../../core/utils/html.js';

export function renderEquipamentoChecklistItem(equipamento) {
    return html`
        <label class="exportar-equip-item">
            <input type="checkbox" class="exportar-equip-checkbox" value="${equipamento.id}" checked>
            <span>${equipamento.modelo} — ${equipamento.categoria?.nome ?? ''}</span>
        </label>
    `;
}