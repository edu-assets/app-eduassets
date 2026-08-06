import { http } from './apiClient.js';
import type { Categoria } from '../../types/index.js';

export function listarCategorias(): Promise<Categoria[]> {
    return http.get<Categoria[]>('/categorias');
}

export function criarCategoria(nome: string): Promise<Categoria> {
    return http.post<Categoria>('/categorias', { nome });
}