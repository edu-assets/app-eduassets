import { escapeHtml } from '../../core/utils/sanitize.js';
import { t } from '../../core/state/i18nStore.js';

interface StatusInfo {
    texto: string;
    modificador: string;
}

const STATUS_MAP: Record<string, StatusInfo> = {
    aberto: { texto: 'shared.statusBadge.aberto', modificador: 'aberto' },
    devolvido: { texto: 'shared.statusBadge.devolvido', modificador: 'devolvido' }
};

export function renderStatusBadge(status: string): string {
    const info = STATUS_MAP[status] ?? { texto: escapeHtml(status), modificador: 'default' };
    return `<span class="status-badge status-badge--${info.modificador}">${info.modificador === 'default' ? info.texto : t(info.texto)}</span>`;
}
