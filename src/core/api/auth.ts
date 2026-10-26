import { http, supportsHttpOnlySession } from './apiClient.js';
import type { LoginResponse, AuthUser } from '../../types/index.js';

export function login(login: string, senha: string): Promise<LoginResponse> {
    return http.post<LoginResponse>('/auth/login', { login, password: senha }, { authMode: 'cookie' });
}

export function getAuthSessionCapabilities(): Promise<{ cookieSession: boolean }> {
    return supportsHttpOnlySession().then((cookieSession) => ({ cookieSession }));
}

export function exchangeRfidLoginCode(code: string): Promise<void> {
    return http.post<void>('/auth/rfid/session', { code }, { authMode: 'cookie' });
}

export function fetchMe(): Promise<AuthUser> {
    return http.get<AuthUser>('/auth/me');
}

export function logoutSession(): Promise<void> {
    return http.post<void>('/auth/logout');
}

export function alterarSenha(senhaAtual: string, novaSenha: string): Promise<{ token?: string } | null> {
    return http.patch<{ token?: string }>('/auth/senha', { senhaAtual, novaSenha }, { authMode: 'cookie' });
}
