import { showToast } from '../ui/index.js';
import { isAutenticado } from '../state/authStore.js';
import { isAdmin } from './permissions.js';

export function bloquearSeConvidado(
    mensagem: string = 'Modo Convidado não permite alterações. Faça login como administrador.'
): boolean {
    if (isAutenticado()) return false;
    showToast(mensagem, 'warning');
    return true;
}

export function bloquearSeNaoAdmin(
    mensagem: string = 'Ação restrita a administradores.'
): boolean {
    if (isAdmin()) return false;
    showToast(mensagem, 'warning');
    return true;
}