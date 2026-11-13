import { http, type OpcoesLeitura } from './apiClient.js';
import type { Responsavel, ResponsavelCreatePayload } from '../../types/index.js';

export function listarResponsaveis(opcoes?: OpcoesLeitura): Promise<Responsavel[]> {
    return http.get<Responsavel[]>('/responsaveis', opcoes);
}

export function criarResponsavel(dados: ResponsavelCreatePayload): Promise<Responsavel> {
    return http.post<Responsavel>('/responsaveis', dados);
}