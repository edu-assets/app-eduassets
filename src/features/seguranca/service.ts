import { alterarSenha } from '../../core/api/auth.js';
import { ApiError } from '../../core/api/index.js';

export async function trocarSenha(senhaAtual: string, novaSenha: string, confirmarSenha: string): Promise<void> {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
        throw new Error('validation.seguranca.preencha_campos');
    }
    if (novaSenha.length < 8) {
        throw new Error('validation.seguranca.senha_minima');
    }
    if (novaSenha !== confirmarSenha) {
        throw new Error('validation.seguranca.confirmacao_incorreta');
    }

    try {
        await alterarSenha(senhaAtual, novaSenha);
    } catch (erro) {
        throw new Error(erro instanceof ApiError ? erro.message : 'feedback.erro_alterar_senha');
    }
}