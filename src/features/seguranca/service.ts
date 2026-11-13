import { alterarSenha } from '../../core/api/auth.js';
import { ApiError } from '../../core/api/index.js';
import { senhaAtendeRegras } from '../../shared/components/passwordField.js';

/** Client-side checks for the change-password form. Returns an i18n key or null. */
export function validarTrocaSenha(senhaAtual: string, novaSenha: string, confirmarSenha: string): string | null {
    if (!senhaAtual || !novaSenha || !confirmarSenha) return 'validation.seguranca.preencha_campos';
    if (!senhaAtendeRegras(novaSenha)) return 'validation.cadastros.senha_fraca';
    if (novaSenha !== confirmarSenha) return 'validation.seguranca.confirmacao_incorreta';
    if (novaSenha === senhaAtual) return 'validation.seguranca.nova_igual_atual';
    return null;
}

export async function trocarSenha(senhaAtual: string, novaSenha: string, confirmarSenha: string): Promise<void> {
    const problema = validarTrocaSenha(senhaAtual, novaSenha, confirmarSenha);
    if (problema) throw new Error(problema);

    try {
        await alterarSenha(senhaAtual, novaSenha);
    } catch (erro) {
        throw new Error(erro instanceof ApiError ? erro.message : 'feedback.erro_alterar_senha');
    }
}
