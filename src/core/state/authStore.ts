import { fetchMe, login as loginRequest, logoutSession } from '../api/auth.js';
import { getToken, setToken } from './tokenStore.js';
import type { AuthUser, AuthState } from '../../types/index.js';

const GUEST_MODE_STORAGE_KEY = 'eduassets_guest_mode';

type AuthListener = (state: AuthState) => void;

let user: AuthUser | null = null;
let listeners: AuthListener[] = [];
let modoConvidadoPersistido = localStorage.getItem(GUEST_MODE_STORAGE_KEY) === 'true';

export function isAutenticado(): boolean {
    return getToken() !== null && user !== null;
}

export function getUsuario(): AuthUser | null {
    return user;
}

export function isModoConvidadoPersistido(): boolean {
    return modoConvidadoPersistido;
}

export function persistirModoConvidado(ativo: boolean): void {
    modoConvidadoPersistido = ativo;
    if (ativo) localStorage.setItem(GUEST_MODE_STORAGE_KEY, 'true');
    else localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
}

export async function iniciarSessao(): Promise<void> {
    if (!getToken()) {
        notify();
        return;
    }

    try {
        user = await fetchMe();
    } catch {
        setToken(null);
        user = null;
        persistirModoConvidado(false);
    }
    notify();
}

export async function entrar(login: string, senha: string): Promise<void> {
    const resposta = await loginRequest(login, senha);
    setToken(resposta.token);
    user = resposta.user;
    persistirModoConvidado(false);
    notify();
}

export function entrarComoConvidado(): void {
    setToken(null);
    user = null;
    persistirModoConvidado(true);
    notify();
}

export function sair(revogarNoServidor = true): void {
    if (revogarNoServidor && getToken()) {
        // Local cleanup is immediate even if the best-effort server request fails.
        void logoutSession().catch(() => undefined);
    }
    setToken(null);
    user = null;
    persistirModoConvidado(false);
    notify();
}

export function atualizarToken(novoToken: string): void {
    setToken(novoToken);
}

export function subscribe(callback: AuthListener): () => void {
    listeners.push(callback);
    return () => { listeners = listeners.filter((l) => l !== callback); };
}

function notify(): void {
    listeners.forEach((callback) => callback({ autenticado: isAutenticado(), usuario: user }));
}
