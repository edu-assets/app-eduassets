import { alterarSenha } from '../../core/api/auth.js';
import { ApiError } from '../../core/api/index.js';
import { atualizarToken } from '../../core/state/authStore.js';

export async function trocarSenha(senhaAtual: string, novaSenha: string, confirmarSenha: string): Promise<void> {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
        throw new Error('validation.seguranca.preencha_campos');
    }
    if (novaSenha.length < 12) {
        throw new Error('validation.seguranca.senha_minima');
    }
    if (novaSenha !== confirmarSenha) {
        throw new Error('validation.seguranca.confirmacao_incorreta');
    }

    try {
        const resposta = await alterarSenha(senhaAtual, novaSenha);
        if (resposta?.token) atualizarToken(resposta.token);
    } catch (erro) {
        throw new Error(erro instanceof ApiError ? erro.message : 'feedback.erro_alterar_senha');
    }
}
