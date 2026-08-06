import { fetchMe, login as loginRequest } from '../api/auth.js';
import { getToken, setToken } from './tokenStore.js';
import type { AuthUser, AuthState } from '../../types/index.js';

type AuthListener = (state: AuthState) => void;

let user: AuthUser | null = null;
let listeners: AuthListener[] = [];

export function isAutenticado(): boolean {
    return getToken() !== null && user !== null;
}

export function getUsuario(): AuthUser | null {
    return user;
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
    }
    notify();
}

export async function entrar(login: string, senha: string): Promise<void> {
    const resposta = await loginRequest(login, senha);
    setToken(resposta.token);
    user = resposta.user;
    notify();
}

export function sair(): void {
    setToken(null);
    user = null;
    notify();
}

export function subscribe(callback: AuthListener): () => void {
    listeners.push(callback);
    return () => { listeners = listeners.filter((l) => l !== callback); };
}

function notify(): void {
    listeners.forEach((callback) => callback({ autenticado: isAutenticado(), usuario: user }));
}