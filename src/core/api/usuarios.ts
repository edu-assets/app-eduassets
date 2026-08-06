import { http } from './apiClient.js';
import type { Usuario, UsuarioCreatePayload } from '../../types/index.js';

export function listarUsuarios(): Promise<Usuario[]> {
    return http.get<Usuario[]>('/usuarios');
}

export function criarUsuario(dados: UsuarioCreatePayload): Promise<Usuario> {
    return http.post<Usuario>('/usuarios', dados);
}