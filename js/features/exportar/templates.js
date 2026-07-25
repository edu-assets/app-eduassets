import { html } from '../../core/utils/html.js';

/* ===== 3. Rendering — generate HTML for the UI ===== */

// TODO: subtype/equipment type filtering in the future, when the subtype field exists in the HTML.
export function renderOpcaoSubtipo(subtipo) {
    return html`<option value="${subtipo.value}">${subtipo.label}</option>`;
}