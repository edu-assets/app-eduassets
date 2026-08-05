import { http } from './apiClient.js';

export function listarOcorrencias() {
    return http.get('/ocorrencias');
}

/** @param {{equipamentoId:number, tipo:'OBSERVACAO'|'MANUTENCAO'|'QUEBRADO', problema:string, descricao:string, numeros:string[]}} dados */
export function criarOcorrencia(dados) {
    return http.post('/ocorrencias', dados);
}

/** @param {number} id @param {{problema?:string, descricao?:string, numero?:string, medidasTomadas?:string}} dados */
export function atualizarOcorrencia(id, dados) {
    return http.patch(`/ocorrencias/${id}`, dados);
}

/** @param {number} id @param {string} medidasTomadas */
export function resolverOcorrencia(id, medidasTomadas) {
    return http.patch(`/ocorrencias/${id}/resolver`, { medidasTomadas });
}

/** @param {number} id */
export function excluirOcorrencia(id) {
    return http.delete(`/ocorrencias/${id}`);
}