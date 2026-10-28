import { http } from './apiClient.js';
import type { Emprestimo, EmprestimoCreatePayload, ItemEmprestimoPayload } from '../../types/index.js';

type EmprestimoPage = { items: Emprestimo[]; nextCursor: number | null };

export function listarEmprestimos(): Promise<Emprestimo[]> {
    return http.get<Emprestimo[] | EmprestimoPage>('/emprestimos').then((response) =>
        Array.isArray(response) ? response : response.items
    );
}

export function criarEmprestimo(dados: EmprestimoCreatePayload): Promise<Emprestimo> {
    return http.post<Emprestimo>('/emprestimos', dados);
}

export function atualizarItensEmprestimo(id: number, itens: ItemEmprestimoPayload[]): Promise<Emprestimo> {
    return http.patch<Emprestimo>(`/emprestimos/${id}`, { itens });
}

export function devolverEmprestimo(id: number, dataDevolucao: string): Promise<Emprestimo> {
    return http.patch<Emprestimo>(`/emprestimos/${id}/devolver`, { dataDevolucao });
}
