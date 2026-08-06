import { showToast } from '../ui/index.js';
import { isAutenticado } from '../state/authStore.js';

export function bloquearSeConvidado(
    mensagem: string = 'Modo Convidado não permite alterações. Faça login como administrador.'
): boolean {
    if (isAutenticado()) return false;
    showToast(mensagem, 'warning');
    return true;
}