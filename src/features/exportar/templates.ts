import { html } from '../../core/utils/html.js';
import type { Equipamento } from '../../types/index.js';

export function renderEquipamentoChecklistItem(equipamento: Equipamento): string {
    return html`
        <label class="exportar-equip-item">
            <input type="checkbox" class="exportar-equip-checkbox" value="${equipamento.id}" checked>
            <span>${equipamento.modelo} — ${equipamento.categoria?.nome ?? ''}</span>
        </label>
    `;
}