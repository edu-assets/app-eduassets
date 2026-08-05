import { http } from './apiClient.js';

export function listarUsuarios() {
    return http.get('/usuarios');
}

/** @param {{nome:string, login:string, nivelAcesso:'ADMINISTRADOR'|'EDITOR'}} dados */
export function criarUsuario(dados) {
    return http.post('/usuarios', dados);
}