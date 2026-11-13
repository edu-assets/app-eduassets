import { http, supportsHttpOnlySession } from './apiClient.js';
import { registrarAmostra } from '../time/serverClock.js';

export interface EstadoSync {
    serverTime: string;
    cursor: string;
    entidades: string[];
}

/**
 * Consulta leve de mudanças (cursor do AuditLog). A requisição é passiva: não renova a atividade do admin.
 * Aproveita a resposta para calibrar o relógio do servidor.
 */
export async function obterEstadoSync(desde?: string): Promise<EstadoSync> {
    const consulta = desde !== undefined && desde !== '' ? `?desde=${encodeURIComponent(desde)}` : '';
    // Resolve antes a checagem de capacidades (pode fazer uma requisição própria) para medir só o /sync/estado.
    await supportsHttpOnlySession();
    const t0 = Date.now();
    const estado = await http.get<EstadoSync>(`/sync/estado${consulta}`, { passivo: true });
    const t1 = Date.now();
    if (estado && typeof estado.serverTime === 'string') registrarAmostra(estado.serverTime, t0, t1);
    return estado;
}
