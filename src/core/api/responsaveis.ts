import { http } from './apiClient.js';
import type { Responsavel, ResponsavelCreatePayload } from '../../types/index.js';

export function listarResponsaveis(): Promise<Responsavel[]> {
    return http.get<Responsavel[]>('/responsaveis');
}

export function criarResponsavel(dados: ResponsavelCreatePayload): Promise<Responsavel> {
    return http.post<Responsavel>('/responsaveis', dados);
}