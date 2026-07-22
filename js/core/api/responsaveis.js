import { http } from './http.js';

export function listarResponsaveis() {
    return http.get('/responsaveis');
}

/** @param {{nome:string, cargo:string}} dados */
export function criarResponsavel(dados) {
    return http.post('/responsaveis', dados);
}