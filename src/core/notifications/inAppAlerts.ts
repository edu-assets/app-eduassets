import { isAdmin } from '../auth/permissions.js';
import { showToast } from '../ui/toast.js';
import { t } from '../state/i18nStore.js';
import { tocarAlerta } from './alertSound.js';
import { abrirPainelDaNotificacao } from './notificationRouting.js';
import { sincronizar } from './pushNotifications.js';

export const MSG_NOTIFICACAO = 'eduassets:notificacao';
export const MSG_ABRIR = 'eduassets:abrir';
export const MSG_RESYNC = 'eduassets:push-resync';

const MAX_TITULO = 120;
const MAX_CORPO = 300;

function texto(valor: unknown, max: number): string {
    return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

/**
 * Handles a message from the service worker. Returns true when an in-app alert (toast + sound) was shown.
 * Alerts are for authenticated administrators with the tab visible; otherwise the system notification
 * already did the job.
 */
export function tratarMensagemServiceWorker(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) return false;
    const mensagem = data as { type?: unknown; payload?: unknown; url?: unknown };

    if (mensagem.type === MSG_ABRIR) {
        abrirPainelDaNotificacao(mensagem.url);
        return false;
    }

    if (mensagem.type === MSG_RESYNC) {
        if (isAdmin()) void sincronizar();
        return false;
    }

    if (mensagem.type !== MSG_NOTIFICACAO) return false;
    if (!isAdmin()) return false;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;

    const payload = (typeof mensagem.payload === 'object' && mensagem.payload !== null ? mensagem.payload : {}) as {
        titulo?: unknown;
        corpo?: unknown;
    };
    const titulo = texto(payload.titulo, MAX_TITULO) || t('notif.atividade_generica');
    const corpo = texto(payload.corpo, MAX_CORPO);

    showToast(corpo ? `${titulo}\n${corpo}` : titulo, 'info');
    tocarAlerta();
    return true;
}

export function ouvirMensagensDoServiceWorker(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', (evento: MessageEvent) => {
        tratarMensagemServiceWorker(evento.data);
    });
    // addEventListener does not start the message queue by itself.
    navigator.serviceWorker.startMessages?.();
}
