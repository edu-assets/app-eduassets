import { http, supportsPushNotifications } from './apiClient.js';

export interface PushConfig {
    habilitado: boolean;
    chavePublica: string | null;
}

export interface PushPreferencias {
    emprestimo: boolean;
    devolucao: boolean;
    ocorrencia: boolean;
}

export interface PushInscricaoJson {
    endpoint: string;
    keys: { p256dh: string; auth: string };
}

/** True when GET /auth/session-capabilities reports pushNotifications (VAPID configured on the API). */
export function pushDisponivelNoServidor(): Promise<boolean> {
    return supportsPushNotifications();
}

export function obterConfigPush(): Promise<PushConfig> {
    return http.get<PushConfig>('/notificacoes/push/config');
}

export function salvarInscricaoPush(
    inscricao: PushInscricaoJson,
    preferencias: PushPreferencias
): Promise<{ preferencias: PushPreferencias }> {
    return http.put<{ preferencias: PushPreferencias }>('/notificacoes/push/inscricao', { inscricao, preferencias });
}

export function removerInscricaoPush(endpoint: string): Promise<void> {
    return http.delete<void>('/notificacoes/push/inscricao', { endpoint });
}

export function enviarNotificacaoTeste(): Promise<void> {
    return http.post<void>('/notificacoes/push/teste');
}
