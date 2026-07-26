const STORAGE_KEY = 'eduassets_token';
let token = localStorage.getItem(STORAGE_KEY);

export function getToken() {
    return token;
}

export function setToken(novoToken) {
    token = novoToken;
    if (novoToken) localStorage.setItem(STORAGE_KEY, novoToken);
    else localStorage.removeItem(STORAGE_KEY);
}