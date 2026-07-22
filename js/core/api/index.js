export * as categoriasApi from './categorias.js';
export * as equipamentosApi from './equipamentos.js';
export * as responsaveisApi from './responsaveis.js';
export * as usuariosApi from './usuarios.js';
export * as emprestimosApi from './emprestimos.js';
export * as ocorrenciasApi from './ocorrencias.js';
export { ApiError } from './apiClient.js';

// import { emprestimosApi, ApiError } from '../../core/api/index.js';

// try {
//     const emprestimos = await emprestimosApi.listarEmprestimos();
// } catch (erro) {
//     if (erro instanceof ApiError) showToast(erro.message, 'error');
// }