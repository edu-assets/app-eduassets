import { http } from './apiClient.js';

export function login(login, senha) {
    return http.post('/auth/login', { login, password: senha });
}

export function fetchMe() {
    return http.get('/auth/me');
}

export function alterarSenha(senhaAtual, novaSenha) {
    return http.patch('/auth/senha', { senhaAtual, novaSenha });
}