import { http } from './apiClient.js';
import type { Usuario, UsuarioCreatePayload } from '../../types/index.js';

export function listarUsuarios(): Promise<Usuario[]> {
    return http.get<Usuario[]>('/usuarios');
}

export function criarUsuario(dados: UsuarioCreatePayload): Promise<Usuario> {
    return http.post<Usuario>('/usuarios', dados);
}

export function gerarTokenRfid(id: number): Promise<{ usuario: { id: number; nome: string }; token: string }> {
    return http.post(`/usuarios/${id}/rfid-token`);
}

export function revogarTokenRfid(id: number): Promise<void> {
    return http.delete(`/usuarios/${id}/rfid-token`);
}