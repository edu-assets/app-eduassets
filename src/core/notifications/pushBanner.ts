import type { SuportePush } from './pushSupport.js';

/** localStorage key holding the timestamp (ms) until which the banner stays dismissed on this device. */
export const BANNER_DISPENSA_KEY = 'eduassets_push_banner_dispensado_ate';
export const BANNER_DISPENSA_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * - 'oculto': nothing to show.
 * - 'ativar': offer the Activate button (support 'suportado', permission not denied).
 * - 'bloqueado': permission denied in the browser; show the unblock guidance instead of the button.
 * - 'ios': iPhone/iPad outside the installed app; show the install hint without a button.
 */
export type VarianteBanner = 'oculto' | 'ativar' | 'bloqueado' | 'ios';

export interface EntradaBanner {
    admin: boolean;
    /** The API has Web Push (VAPID) configured. */
    servidorPush: boolean;
    suporte: SuportePush;
    /** This browser already holds a push subscription. */
    inscrito: boolean;
    dispensado: boolean;
}

export function decidirBanner(entrada: EntradaBanner): VarianteBanner {
    if (!entrada.admin || !entrada.servidorPush || entrada.inscrito || entrada.dispensado) return 'oculto';
    switch (entrada.suporte) {
        case 'suportado': return 'ativar';
        case 'bloqueado': return 'bloqueado';
        case 'ios_instalar': return 'ios';
        default: return 'oculto';
    }
}

/** True while a previous "Agora não" is still in effect. Storage failures count as not dismissed. */
export function bannerDispensado(agora: number = Date.now()): boolean {
    try {
        const ate = Number(localStorage.getItem(BANNER_DISPENSA_KEY));
        // A value further in the future than the dismissal window is corrupt: ignore it.
        return Number.isFinite(ate) && ate > agora && ate - agora <= BANNER_DISPENSA_MS;
    } catch {
        return false;
    }
}

/** Remembers "Agora não" for 7 days on this device. Silently does nothing when storage is unavailable. */
export function dispensarBanner(agora: number = Date.now()): void {
    try {
        localStorage.setItem(BANNER_DISPENSA_KEY, String(agora + BANNER_DISPENSA_MS));
    } catch {
        /* storage unavailable: the banner comes back on the next evaluation */
    }
}
