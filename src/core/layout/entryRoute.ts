export const LOGIN_ROUTE_HASH = '#login';
export const APP_ROUTE_HASH = '#app';

export type EntryDestination = 'login' | 'app';

export function resolveEntryDestination(
    currentHash: string,
    authenticated: boolean,
    guestModePersisted: boolean,
    hadTokenAtStartup: boolean
): EntryDestination {
    if (hadTokenAtStartup && !authenticated) return 'login';
    if (currentHash === LOGIN_ROUTE_HASH) return authenticated ? 'app' : 'login';
    return authenticated || guestModePersisted ? 'app' : 'login';
}

export function isLoginRoute(): boolean {
    return window.location.hash === LOGIN_ROUTE_HASH;
}

export function setEntryRoute(destination: EntryDestination): void {
    const nextHash = destination === 'login' ? LOGIN_ROUTE_HASH : APP_ROUTE_HASH;
    if (window.location.hash !== nextHash) window.location.hash = nextHash;
}
