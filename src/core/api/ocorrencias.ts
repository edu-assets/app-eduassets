import { http, type OpcoesLeitura } from './apiClient.js';
import type { Ocorrencia, OcorrenciaCreatePayload, OcorrenciaUpdatePayload } from '../../types/index.js';

export function listarOcorrencias(opcoes?: OpcoesLeitura): Promise<Ocorrencia[]> {
    return http.get<Ocorrencia[]>('/ocorrencias', opcoes);
}

export function criarOcorrencia(dados: OcorrenciaCreatePayload): Promise<Ocorrencia[]> {
    return http.post<Ocorrencia[]>('/ocorrencias', dados);
}

export function atualizarOcorrencia(id: number, dados: OcorrenciaUpdatePayload): Promise<Ocorrencia> {
    return http.patch<Ocorrencia>(`/ocorrencias/${id}`, dados);
}

export function resolverOcorrencia(id: number, medidasTomadas: string): Promise<Ocorrencia> {
    return http.patch<Ocorrencia>(`/ocorrencias/${id}/resolver`, { medidasTomadas });
}

export function excluirOcorrencia(id: number): Promise<void> {
    return http.delete<void>(`/ocorrencias/${id}`);
}