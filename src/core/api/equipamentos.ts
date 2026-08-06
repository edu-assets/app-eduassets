import { http } from './apiClient.js';
import type { Equipamento, EquipamentoCreatePayload, EquipamentoUpdatePayload } from '../../types/index.js';

export function listarEquipamentos(): Promise<Equipamento[]> {
    return http.get<Equipamento[]>('/equipamentos');
}

export function criarEquipamento(dados: EquipamentoCreatePayload): Promise<Equipamento> {
    return http.post<Equipamento>('/equipamentos', dados);
}

export function atualizarEquipamento(id: number, dados: EquipamentoUpdatePayload): Promise<Equipamento> {
    return http.patch<Equipamento>(`/equipamentos/${id}`, dados);
}