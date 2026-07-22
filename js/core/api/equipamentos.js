import { http } from './apiClient.js';

export function listarEquipamentos() {
    return http.get('/equipamentos');
}

/** @param {{categoriaId:number, modelo:string, quantidadeTotal:number}} dados */
export function criarEquipamento(dados) {
    return http.post('/equipamentos', dados);
}

/** @param {number} id @param {{quantidadeTotal?:number, quantidadeDisponivel?:number, quantidadeQuebrada?:number}} dados */
export function atualizarEquipamento(id, dados) {
    return http.patch(`/equipamentos/${id}`, dados);
}