import { fetchMe, login as loginRequest, logoutSession } from '../api/auth.js';
import { setToken } from './tokenStore.js';
import type { AuthUser, AuthState } from '../../types/index.js';

const GUEST_ENTRY_SESSION_KEY = 'eduassets_guest_entry_authorized';
// Set when a logout could not be confirmed by the API (e.g. offline). The HttpOnly session cookie may still
// be valid, so the session must be revoked before any session restore is attempted.
const LOGOUT_PENDENTE_KEY = 'eduassets_logout_pendente';
localStorage.removeItem('eduassets_guest_mode');

type AuthListener = (state: AuthState) => void;

let user: AuthUser | null = null;
let listeners: AuthListener[] = [];
let acessoConvidadoAutorizado = sessionStorage.getItem(GUEST_ENTRY_SESSION_KEY) === 'true';

export function isAutenticado(): boolean {
    return user !== null;
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

function isLogoutPendente(): boolean {
    try {
        return localStorage.getItem(LOGOUT_PENDENTE_KEY) === 'true';
    } catch {
        return false;
    }
}

function definirLogoutPendente(ativo: boolean): void {
    try {
        if (ativo) localStorage.setItem(LOGOUT_PENDENTE_KEY, 'true');
        else localStorage.removeItem(LOGOUT_PENDENTE_KEY);
    } catch {
        /* storage unavailable: the in-memory state is already cleared */
    }
}

function statusDoErro(erro: unknown): number | undefined {
    return typeof erro === 'object' && erro !== null && 'status' in erro
        ? Number((erro as { status: unknown }).status)
        : undefined;
}

/**
 * Retries a pending server-side logout. 401/403 mean the cookie session is already gone, which also
 * settles the pending state. Returns true when no revocation is pending anymore.
 */
export async function concluirLogoutPendente(): Promise<boolean> {
    if (!isLogoutPendente()) return true;
    try {
        await logoutSession();
    } catch (erro) {
        const status = statusDoErro(erro);
        if (status !== 401 && status !== 403) return false;
    }
    definirLogoutPendente(false);
    return true;
}

function agendarRepeticaoLogout(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => { void concluirLogoutPendente(); }, { once: true });
}

export async function iniciarSessao(): Promise<void> {
    if (isLogoutPendente()) {
        // Fail closed: never restore a session the user asked to end, even while revocation is still pending.
        const concluido = await concluirLogoutPendente();
        if (!concluido) agendarRepeticaoLogout();
        setToken(null);
        user = null;
        notify();
        return;
    }
    try {
        user = await fetchMe();
        definirAcessoConvidadoAutorizado(false);
    } catch {
        setToken(null);
        user = null;
        if (!acessoConvidadoAutorizado) definirAcessoConvidadoAutorizado(false);
    }
    notify();
}

/** Replaces the cached profile WITHOUT notifying subscribers (no session-wide resync). Ignored when the user id differs. */
export function atualizarUsuarioLocal(atualizado: AuthUser): void {
    if (!user || user.id !== atualizado.id) return;
    user = atualizado;
}

export async function entrar(login: string, senha: string): Promise<void> {
    const resposta = await loginRequest(login, senha);
    // A fresh login replaces the session cookie, so the abandoned session can no longer be restored here.
    definirLogoutPendente(false);
    setToken(null);
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

export function sair(revogarNoServidor = true): Promise<void> {
    let revogacao: Promise<void> = Promise.resolve();
    if (revogarNoServidor && user) {
        definirLogoutPendente(true);
        revogacao = concluirLogoutPendente().then((concluido) => {
            if (!concluido) agendarRepeticaoLogout();
        });
    }
    setToken(null);
    user = null;
    definirAcessoConvidadoAutorizado(false);
    notify();
    return revogacao;
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
