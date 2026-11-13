import { ehHashApp, parseRota, serializarRota } from '../layout/appRoutes.js';
import { esquecerRotaAtual, isNavegacaoIniciada, navegarPara } from '../layout/navigation.js';

/**
 * Panel to reopen after signing in again. Saved (per tab, sessionStorage) when the session expires, so the
 * user returns to the panel they were on, also after a reload of the tab while at #login. Cleared after use
 * and on an explicit sign-out (the next person starts at Início).
 */
export const CHAVE_ROTA_POS_LOGIN = 'eduassets_rota_pos_login';

export function salvarRotaPosLogin(hash: string | null): void {
    const rota = hash ? parseRota(hash) : null;
    if (!rota || rota.desconhecida) return;
    try {
        sessionStorage.setItem(CHAVE_ROTA_POS_LOGIN, serializarRota(rota));
    } catch {
        /* storage unavailable: the same tab still reopens the last panel through the router */
    }
}

export function lerRotaPosLogin(): string | null {
    try {
        return sessionStorage.getItem(CHAVE_ROTA_POS_LOGIN);
    } catch {
        return null;
    }
}

export function limparRotaPosLogin(): void {
    try {
        sessionStorage.removeItem(CHAVE_ROTA_POS_LOGIN);
    } catch {
        /* storage unavailable */
    }
}

/** Explicit sign-out: forget the saved route and the router's last panel. */
export function esquecerRotaDoUsuario(): void {
    limparRotaPosLogin();
    esquecerRotaAtual();
}

/**
 * Reopens the saved panel after a successful sign-in and clears it. Permissions are still enforced by the
 * router (an editor never lands on an admin-only panel). A specific panel already in the URL wins.
 * Returns true when the saved route was applied.
 */
export function restaurarRotaPosLogin(): boolean {
    const salva = lerRotaPosLogin();
    limparRotaPosLogin();
    const rota = salva ? parseRota(salva) : null;
    if (!rota || rota.desconhecida) return false;

    const hashAtual = window.location.hash;
    if (ehHashApp(hashAtual) && hashAtual !== '#app') return false;

    if (isNavegacaoIniciada()) {
        navegarPara(rota.slug, { ...(rota.aba ? { aba: rota.aba } : {}), substituir: true, focar: false });
    } else {
        // Before the router starts (sign-in on the entry screen): put the route in the URL; initNavigation opens
        // it, after every feature is listening, and applies the permission guard.
        const { pathname, search } = window.location;
        window.history.replaceState(window.history.state, '', `${pathname}${search}${serializarRota(rota)}`);
    }
    return true;
}
