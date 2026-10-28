const LEGACY_TOKEN_STORAGE_KEY = 'eduassets_token';

function clearLegacyToken(): void {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
        }
    } catch {
        // Storage may be unavailable; cookie sessions do not depend on it.
    }
}

// Remove credentials written by earlier releases before cookie-session startup.
clearLegacyToken();

/** Browser authentication is cookie-only; bearer tokens are never restored. */
export function getToken(): null {
    clearLegacyToken();
    return null;
}

/** Reject token persistence and keep the legacy key empty. */
export function setToken(token: string | null): boolean {
    clearLegacyToken();
    return token === null;
}
