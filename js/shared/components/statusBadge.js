import { escapeHtml } from '../../core/utils/sanitize.js';

const STATUS_MAP = {
    aberto: { texto: 'Aberto', modificador: 'aberto' },
    devolvido: { texto: 'Devolvido', modificador: 'devolvido' }
};

export function renderStatusBadge(status) {
    const info = STATUS_MAP[status] ?? { texto: escapeHtml(status), modificador: 'default' };
    return `<span class="status-badge status-badge--${info.modificador}">${info.texto}</span>`;
}