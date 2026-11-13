import { ehHashApp } from './appRoutes.js';

export const LOGIN_ROUTE_HASH = '#login';
export const APP_ROUTE_HASH = '#app';
export const TERMS_ROUTE_HASH = '#termos';
export const PRIVACY_ROUTE_HASH = '#privacidade';

export type EntryDestination = 'login' | 'app' | 'terms' | 'privacy';

const ROUTE_BY_DESTINATION: Record<EntryDestination, string> = {
    login: LOGIN_ROUTE_HASH,
    app: APP_ROUTE_HASH,
    terms: TERMS_ROUTE_HASH,
    privacy: PRIVACY_ROUTE_HASH,
};

export function resolveEntryDestination(
    currentHash: string,
    authenticated: boolean,
    guestEntryAuthorized: boolean
): EntryDestination {
    if (currentHash === TERMS_ROUTE_HASH) return 'terms';
    if (currentHash === PRIVACY_ROUTE_HASH) return 'privacy';
    if (currentHash === LOGIN_ROUTE_HASH) return authenticated ? 'app' : 'login';
    return authenticated || guestEntryAuthorized ? 'app' : 'login';
}

export function isLoginRoute(): boolean {
    return window.location.hash === LOGIN_ROUTE_HASH;
}

export function setEntryRoute(destination: EntryDestination): void {
    const nextHash = ROUTE_BY_DESTINATION[destination];
    document.documentElement.dataset.entryState = destination;
    // Entering the app keeps a panel route that is already in the URL ("#app/devolucoes" survives a reload).
    if (destination === 'app' && ehHashApp(window.location.hash)) return;
    if (window.location.hash !== nextHash) window.location.hash = nextHash;
}
