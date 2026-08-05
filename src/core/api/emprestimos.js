import { http } from './apiClient.js';

export function listarEmprestimos() {
    return http.get('/emprestimos');
}

/** @param {{solicitanteNome:string, responsavelId:number, dataRetirada:string, observacao?:string, itens:Array<{equipamentoId:number, quantidade:number}>}} dados */
export function criarEmprestimo(dados) {
    return http.post('/emprestimos', dados);
}

/** @param {number} id @param {Array<{equipamentoId:number, quantidade:number}>} itens */
export function atualizarItensEmprestimo(id, itens) {
    return http.patch(`/emprestimos/${id}`, { itens });
}

/** @param {number} id */
export function devolverEmprestimo(id) {
    return http.patch(`/emprestimos/${id}/devolver`);
}