const STORAGE_KEY = 'eduassets_token';

interface PersistedToken {
    token: string;
    expiresAt: number;
}

const storedSession = readStoredToken();
let token: string | null = storedSession?.token ?? null;
let expiresAt: number | null = storedSession?.expiresAt ?? null;

export function getToken(): string | null {
    if (token && expiresAt !== null && expiresAt <= Date.now()) {
        clearToken();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('eduassets:sessao-expirada'));
        }
    }
    return token;
}

export function setToken(novoToken: string | null): boolean {
    if (novoToken === null) {
        clearToken();
        return true;
    }

    const jwtExpiresAt = getJwtExpiration(novoToken);
    if (jwtExpiresAt === null || jwtExpiresAt <= Date.now()) {
        clearToken();
        return false;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: novoToken, expiresAt: jwtExpiresAt } satisfies PersistedToken));
    } catch {
        token = null;
        expiresAt = null;
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage unavailable: fail closed in memory. */ }
        return false;
    }
    token = novoToken;
    expiresAt = jwtExpiresAt;
    return true;
}

function readStoredToken(): PersistedToken | null {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return null;

    let storedToken = storedValue;
    let storedExpiry: number | null = null;
    let legacyRawToken = true;

    try {
        const parsed: unknown = JSON.parse(storedValue);
        if (typeof parsed === 'object' && parsed !== null && 'token' in parsed) {
            const session = parsed as Partial<PersistedToken>;
            if (typeof session.token !== 'string') {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
            storedToken = session.token;
            storedExpiry = typeof session.expiresAt === 'number' && Number.isFinite(session.expiresAt)
                ? session.expiresAt
                : null;
            legacyRawToken = false;
        }
    } catch {
        // Older releases stored only the raw JWT. Its signed exp claim is used to migrate it.
    }

    const jwtExpiresAt = getJwtExpiration(storedToken);
    if (jwtExpiresAt === null) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }

    // Never allow local metadata to extend the signed JWT lifetime.
    const effectiveExpiry = storedExpiry === null ? jwtExpiresAt : Math.min(storedExpiry, jwtExpiresAt);
    if (!Number.isFinite(effectiveExpiry) || effectiveExpiry <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }

    if (legacyRawToken || storedExpiry !== effectiveExpiry) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: storedToken, expiresAt: effectiveExpiry } satisfies PersistedToken));
        } catch {
            try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage unavailable: do not restore an in-memory-only session. */ }
            return null;
        }
    }
    return { token: storedToken, expiresAt: effectiveExpiry };
}

function getJwtExpiration(value: string): number | null {
    const parts = value.split('.');
    if (parts.length !== 3 || !parts[1]) return null;

    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
        if (typeof payload !== 'object' || payload === null || !('exp' in payload)) return null;
        const exp = (payload as { exp?: unknown }).exp;
        if (typeof exp !== 'number' || !Number.isSafeInteger(exp) || exp <= 0) return null;
        return exp * 1000;
    } catch {
        return null;
    }
}

function clearToken(): void {
    token = null;
    expiresAt = null;
    localStorage.removeItem(STORAGE_KEY);
}
