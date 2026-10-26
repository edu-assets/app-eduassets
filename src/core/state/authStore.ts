import { fetchMe, login as loginRequest, logoutSession } from '../api/auth.js';
import { getToken, setToken } from './tokenStore.js';
import type { AuthUser, AuthState } from '../../types/index.js';

const GUEST_ENTRY_SESSION_KEY = 'eduassets_guest_entry_authorized';
localStorage.removeItem('eduassets_guest_mode');

type AuthListener = (state: AuthState) => void;

let user: AuthUser | null = null;
let listeners: AuthListener[] = [];
let acessoConvidadoAutorizado = sessionStorage.getItem(GUEST_ENTRY_SESSION_KEY) === 'true';

export function isAutenticado(): boolean {
    return getToken() !== null && user !== null;
}

export function getUsuario(): AuthUser | null {
    return user;
}

export function isAcessoConvidadoAutorizado(): boolean {
    return acessoConvidadoAutorizado;
}

function definirAcessoConvidadoAutorizado(ativo: boolean): void {
    acessoConvidadoAutorizado = ativo;
    if (ativo) sessionStorage.setItem(GUEST_ENTRY_SESSION_KEY, 'true');
    else sessionStorage.removeItem(GUEST_ENTRY_SESSION_KEY);
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
        definirAcessoConvidadoAutorizado(false);
    }
    notify();
}

export async function entrar(login: string, senha: string): Promise<void> {
    const resposta = await loginRequest(login, senha);
    if (!setToken(resposta.token)) {
        user = null;
        definirAcessoConvidadoAutorizado(false);
        notify();
        throw new Error('auth.token_invalido');
    }
    user = resposta.user;
    definirAcessoConvidadoAutorizado(false);
    notify();
}

export function entrarComoConvidado(): void {
    setToken(null);
    user = null;
    definirAcessoConvidadoAutorizado(true);
    notify();
}

export function sair(revogarNoServidor = true): void {
    if (revogarNoServidor && getToken()) {
        // Local cleanup is immediate even if the best-effort server request fails.
        void logoutSession().catch(() => undefined);
    }
    setToken(null);
    user = null;
    definirAcessoConvidadoAutorizado(false);
    notify();
}

export function atualizarToken(novoToken: string): void {
    if (!setToken(novoToken)) {
        user = null;
        definirAcessoConvidadoAutorizado(false);
        notify();
        throw new Error('auth.token_invalido');
    }
}

export function subscribe(callback: AuthListener): () => void {
    listeners.push(callback);
    return () => { listeners = listeners.filter((l) => l !== callback); };
}

function notify(): void {
    listeners.forEach((callback) => callback({ autenticado: isAutenticado(), usuario: user }));
}
