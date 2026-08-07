import { alterarSenha } from '../../core/api/auth.js';
import { ApiError } from '../../core/api/index.js';

export async function trocarSenha(senhaAtual: string, novaSenha: string, confirmarSenha: string): Promise<void> {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
        throw new Error('Preencha todos os campos de senha.');
    }
    if (novaSenha.length < 8) {
        throw new Error('A nova senha deve ter no mínimo 8 caracteres.');
    }
    if (novaSenha !== confirmarSenha) {
        throw new Error('A confirmação não corresponde à nova senha.');
    }

    try {
        await alterarSenha(senhaAtual, novaSenha);
    } catch (erro) {
        throw new Error(erro instanceof ApiError ? erro.message : 'Erro ao alterar senha.');
    }
}