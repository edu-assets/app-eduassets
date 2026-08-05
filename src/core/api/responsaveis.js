import { http } from './apiClient.js';

export function listarResponsaveis() {
    return http.get('/responsaveis');
}

/** @param {{nome:string, cargo:string}} dados */
export function criarResponsavel(dados) {
    return http.post('/responsaveis', dados);
}