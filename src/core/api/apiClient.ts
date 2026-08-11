import { API_BASE_URL } from './apiConfig.js';
import { getToken } from '../state/tokenStore.js';

export interface ApiErrorPayload {
    erro?: string;
    [key: string]: unknown;
}

export class ApiError extends Error {
    status: number;
    payload: ApiErrorPayload | null;

    constructor(message: string, status: number, payload: ApiErrorPayload | null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.payload = payload;
    }
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
}

async function request<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const temConteudo = response.status !== 204;
    let payload: ApiErrorPayload | null = null;
    let respostaInvalida = false;

    if (temConteudo) {
        try {
            payload = await response.json();
        } catch {
            respostaInvalida = true;
        }
    }

    if (!response.ok) {
        if (response.status === 401 && (payload as any)?.sessaoExpirada) {
            window.dispatchEvent(new Event('eduassets:sessao-expirada'));
        }
        const mensagem = payload?.erro || `Erro ${response.status} ao comunicar com a API`;
        throw new ApiError(mensagem, response.status, payload);
    }

    if (respostaInvalida) {
        throw new ApiError(
            `Resposta inválida da API em "${path}". Verifique se VITE_API_BASE_URL aponta para o backend correto.`,
            response.status,
            null
        );
    }

    return payload as T;
}

export const http = {
    get: <T>(path: string): Promise<T> => request<T>(path),
    post: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: 'POST', body }),
    patch: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: 'PATCH', body }),
    delete: <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' })
};

