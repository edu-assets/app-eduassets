import { escapeHtml } from '../../core/utils/sanitize.js';

interface StatusInfo {
    texto: string;
    modificador: string;
}

const STATUS_MAP: Record<string, StatusInfo> = {
    aberto: { texto: 'Aberto', modificador: 'aberto' },
    devolvido: { texto: 'Devolvido', modificador: 'devolvido' }
};

export function renderStatusBadge(status: string): string {
    const info = STATUS_MAP[status] ?? { texto: escapeHtml(status), modificador: 'default' };
    return `<span class="status-badge status-badge--${info.modificador}">${info.texto}</span>`;
}