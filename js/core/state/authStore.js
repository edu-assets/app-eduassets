import { fetchMe, login as loginRequest } from '../api/auth.js';
import { getToken, setToken } from './tokenStore.js';

let user = null;
let listeners = [];

export function isAutenticado() {
    return getToken() !== null && user !== null;
}

export function getUsuario() {
    return user;
}

export async function iniciarSessao() {
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

export async function entrar(login, senha) {
    const resposta = await loginRequest(login, senha);
    setToken(resposta.token);
    user = resposta.user;
    notify();
}

export function sair() {
    setToken(null);
    user = null;
    notify();
}

export function subscribe(callback) {
    listeners.push(callback);
    return () => { listeners = listeners.filter((l) => l !== callback); };
}

function notify() {
    listeners.forEach((callback) => callback({ autenticado: isAutenticado(), usuario: user }));
}