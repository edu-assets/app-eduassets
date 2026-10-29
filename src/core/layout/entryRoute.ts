export const LOGIN_ROUTE_HASH = '#login';
export const APP_ROUTE_HASH = '#app';
export const TERMS_ROUTE_HASH = '#termos';

export type EntryDestination = 'login' | 'app' | 'terms';

export function resolveEntryDestination(
    currentHash: string,
    authenticated: boolean,
    guestEntryAuthorized: boolean
): EntryDestination {
    if (currentHash === TERMS_ROUTE_HASH) return 'terms';
    if (currentHash === LOGIN_ROUTE_HASH) return authenticated ? 'app' : 'login';
    return authenticated || guestEntryAuthorized ? 'app' : 'login';
}

export function isLoginRoute(): boolean {
    return window.location.hash === LOGIN_ROUTE_HASH;
}

export function setEntryRoute(destination: EntryDestination): void {
    const nextHash = destination === 'login'
        ? LOGIN_ROUTE_HASH
        : (destination === 'terms' ? TERMS_ROUTE_HASH : APP_ROUTE_HASH);
    document.documentElement.dataset.entryState = destination;
    if (window.location.hash !== nextHash) window.location.hash = nextHash;
}
