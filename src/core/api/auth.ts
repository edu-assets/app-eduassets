import { http } from './apiClient.js';
import type { LoginResponse, AuthUser } from '../../types/index.js';

export function login(login: string, senha: string): Promise<LoginResponse> {
    return http.post<LoginResponse>('/auth/login', { login, password: senha });
}

export function fetchMe(): Promise<AuthUser> {
    return http.get<AuthUser>('/auth/me');
}

export function alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
    return http.patch<void>('/auth/senha', { senhaAtual, novaSenha });
}