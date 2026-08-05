import { showToast } from '../ui/index.js';
import { isAutenticado } from '../state/authStore.js';

/** @returns {boolean} true se bloqueou a ação (o handler deve dar `return`) */
export function bloquearSeConvidado(mensagem = 'Modo Convidado não permite alterações. Faça login como administrador.') {
    if (isAutenticado()) return false;
    showToast(mensagem, 'warning');
    return true;
}