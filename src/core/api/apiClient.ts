import { API_BASE_URL } from './apiConfig.js';
import { getToken } from '../state/tokenStore.js';
import { t } from '../state/i18nStore.js';

export interface ValidationErrorDetail {
    campo?: string;
    mensagem?: string;
    [key: string]: unknown;
}

export interface ApiErrorPayload {
    erro?: string;
    sessaoExpirada?: boolean;
    detalhes?: ValidationErrorDetail[];
    [key: string]: unknown;
}

export class ApiError extends Error {
    status: number;
    payload: ApiErrorPayload | null;
    detalhesValidacao: ValidationErrorDetail[] | null;

    constructor(message: string, status: number, payload: ApiErrorPayload | null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.payload = payload;
        this.detalhesValidacao = Array.isArray(payload?.detalhes) ? payload.detalhes : null;
    }
}

let cookieSessionSupport: boolean | null = null;
let cookieSessionSupportCheck: Promise<boolean> | null = null;

export function supportsHttpOnlySession(): Promise<boolean> {
    if (cookieSessionSupport !== null) return Promise.resolve(cookieSessionSupport);
    if (!cookieSessionSupportCheck) {
        cookieSessionSupportCheck = (async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/session-capabilities`, {
                    method: 'GET',
                    credentials: 'omit',
                    cache: 'no-store',
                    headers: { Accept: 'application/json' },
                });
                if (response.status === 404) {
                    cookieSessionSupport = false;
                    return false;
                }
                if (!response.ok) return false;
                const result = await response.json() as { cookieSession?: unknown };
                cookieSessionSupport = result.cookieSession === true;
                return cookieSessionSupport;
            } catch {
                return false;
            } finally {
                cookieSessionSupportCheck = null;
            }
        })();
    }
    return cookieSessionSupportCheck;
}

function formatarDetalhesValidacao(detalhes: ValidationErrorDetail[] | null | undefined): string | null {
    if (!Array.isArray(detalhes) || detalhes.length === 0) return null;

    const mensagem = detalhes
        .map((detalhe) => {
            const campo = detalhe.campo?.trim();
            const texto = detalhe.mensagem?.trim();

            if (campo && texto) return `${campo}: ${texto}`;
            return campo || texto || null;
        })
        .filter((valor): valor is string => Boolean(valor))
        .map((valor) => `- ${valor}`)
        .join('\n');

    return mensagem || null;
}

function formatarMensagemErro(payload: ApiErrorPayload | null, status: number): string {
    const mensagemBase = payload?.erro
        ? t(payload.erro)
        : t('feedback.erro_api_generico').replace('{status}', String(status));
    const detalhes = formatarDetalhesValidacao(payload?.detalhes);

    return detalhes ? `${mensagemBase}\n${detalhes}` : mensagemBase;
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    authMode?: 'cookie';
}

async function request<T>(path: string, { method = 'GET', body, authMode }: RequestOptions = {}): Promise<T> {
    const token = getToken();
    const cookieSession = await supportsHttpOnlySession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (authMode === 'cookie' && cookieSession) headers['X-Auth-Mode'] = 'cookie';

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            credentials: cookieSession ? 'include' : 'omit',
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
    } catch {
        const payload = { erro: 'backend.geral.api_indisponivel' };
        throw new ApiError(t(payload.erro), 503, payload);
    }

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
        if (response.status === 401) {
            window.dispatchEvent(new Event('eduassets:sessao-expirada'));
        }
        const mensagem = formatarMensagemErro(payload, response.status);
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
    post: <T>(path: string, body?: unknown, options: Pick<RequestOptions, 'authMode'> = {}): Promise<T> => request<T>(path, { ...options, method: 'POST', body }),
    patch: <T>(path: string, body?: unknown, options: Pick<RequestOptions, 'authMode'> = {}): Promise<T> => request<T>(path, { ...options, method: 'PATCH', body }),
    delete: <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' })
};
