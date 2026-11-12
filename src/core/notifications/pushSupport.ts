/**
 * Browser capability detection for Web Push.
 *
 * - 'suportado': service worker, Push API and Notifications are available and permission is not blocked.
 * - 'ios_instalar': iPhone/iPad outside the installed (standalone) app. Safari only exposes Web Push to a
 *   web app added to the Home Screen (iOS 16.4+), so the UI shows the install instructions instead.
 * - 'bloqueado': the user denied the notification permission in the browser.
 * - 'nao_suportado': the browser lacks a required API (or the page is not a secure context).
 */
export type SuportePush = 'suportado' | 'nao_suportado' | 'ios_instalar' | 'bloqueado';

export type PermissaoNotificacao = 'default' | 'granted' | 'denied';

export interface AmbientePush {
    userAgent: string;
    platform: string;
    maxTouchPoints: number;
    standalone: boolean;
    temServiceWorker: boolean;
    temPushManager: boolean;
    temNotification: boolean;
    permissao: PermissaoNotificacao | null;
}

export function ehIos(ambiente: Pick<AmbientePush, 'userAgent' | 'platform' | 'maxTouchPoints'>): boolean {
    if (/iPhone|iPad|iPod/i.test(ambiente.userAgent)) return true;
    // iPadOS 13+ reports a desktop Mac user agent; touch support tells it apart from a real Mac.
    return ambiente.platform === 'MacIntel' && ambiente.maxTouchPoints > 1;
}

export function detectarSuportePush(ambiente: AmbientePush = lerAmbientePush()): SuportePush {
    if (ehIos(ambiente) && !ambiente.standalone) return 'ios_instalar';
    if (!ambiente.temServiceWorker || !ambiente.temPushManager || !ambiente.temNotification) return 'nao_suportado';
    if (ambiente.permissao === 'denied') return 'bloqueado';
    return 'suportado';
}

function estaEmModoStandalone(): boolean {
    const legacy = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const displayMode = typeof window.matchMedia === 'function'
        && window.matchMedia('(display-mode: standalone)').matches;
    return legacy || displayMode;
}

export function lerAmbientePush(): AmbientePush {
    return {
        userAgent: navigator.userAgent ?? '',
        platform: navigator.platform ?? '',
        maxTouchPoints: navigator.maxTouchPoints ?? 0,
        standalone: estaEmModoStandalone(),
        temServiceWorker: 'serviceWorker' in navigator,
        temPushManager: typeof window !== 'undefined' && 'PushManager' in window,
        temNotification: typeof Notification !== 'undefined',
        permissao: typeof Notification !== 'undefined' ? Notification.permission : null
    };
}
