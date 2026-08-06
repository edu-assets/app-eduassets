const STORAGE_KEY = 'eduassets_token';
let token: string | null = localStorage.getItem(STORAGE_KEY);

export function getToken(): string | null {
    return token;
}

export function setToken(novoToken: string | null): void {
    token = novoToken;
    if (novoToken) localStorage.setItem(STORAGE_KEY, novoToken);
    else localStorage.removeItem(STORAGE_KEY);
}