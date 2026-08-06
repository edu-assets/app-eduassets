import { http } from './apiClient.js';
import type { Emprestimo, EmprestimoCreatePayload, ItemEmprestimoPayload } from '../../types/index.js';

export function listarEmprestimos(): Promise<Emprestimo[]> {
    return http.get<Emprestimo[]>('/emprestimos');
}

export function criarEmprestimo(dados: EmprestimoCreatePayload): Promise<Emprestimo> {
    return http.post<Emprestimo>('/emprestimos', dados);
}

export function atualizarItensEmprestimo(id: number, itens: ItemEmprestimoPayload[]): Promise<Emprestimo> {
    return http.patch<Emprestimo>(`/emprestimos/${id}`, { itens });
}

export function devolverEmprestimo(id: number): Promise<Emprestimo> {
    return http.patch<Emprestimo>(`/emprestimos/${id}/devolver`);
}