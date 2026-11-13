import { http, type OpcoesLeitura } from './apiClient.js';
import type { Responsavel, ResponsavelCreatePayload, ResponsavelUpdatePayload } from '../../types/index.js';

/** Default list is active-only; `incluirInativos` (admin) also returns deactivated ones. */
export function listarResponsaveis(opcoes?: OpcoesLeitura & { incluirInativos?: boolean }): Promise<Responsavel[]> {
    const { incluirInativos, ...leitura } = opcoes ?? {};
    return http.get<Responsavel[]>(incluirInativos ? '/responsaveis?incluirInativos=true' : '/responsaveis', leitura);
}

export function atualizarResponsavel(id: number, dados: ResponsavelUpdatePayload): Promise<Responsavel> {
    return http.patch<Responsavel>(`/responsaveis/${id}`, dados);
}

export function criarResponsavel(dados: ResponsavelCreatePayload): Promise<Responsavel> {
    return http.post<Responsavel>('/responsaveis', dados);
}