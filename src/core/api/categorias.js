import { http } from './apiClient.js';

/** @returns {Promise<Array<{id:number, nome:string}>>} */
export function listarCategorias() {
    return http.get('/categorias');
}

/** @param {string} nome */
export function criarCategoria(nome) {
    return http.post('/categorias', { nome });
}