import { showToast } from '../../core/ui/index.js';
import { t, traduzirErro } from '../../core/state/i18nStore.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';
import { getUsuario, atualizarUsuarioLocal } from '../../core/state/authStore.js';
import { fetchMe } from '../../core/api/auth.js';
import { trocarSenha, validarTrocaSenha } from './service.js';
import { alternarFormSenha, mostrarErro, renderInfoConta } from './render.js';
import type { SegurancaEls, SegurancaEstado } from './render.js';

/** Refreshes only the Segurança panel (no global auth notification, so session data is not reloaded). */
export async function atualizarPainelAposTroca(els: SegurancaEls): Promise<void> {
    const atual = getUsuario();
    if (!atual) return;
    try {
        atualizarUsuarioLocal(await fetchMe());
    } catch {
        atualizarUsuarioLocal({ ...atual, senhaAlteradaEm: new Date().toISOString() });
    }
    renderInfoConta(els, getUsuario());
}

export function attachSegurancaEvents(els: SegurancaEls, estado: SegurancaEstado): void {
    els.btnToggleSenha.addEventListener('click', () => {
        if (bloquearSeConvidado()) return;
        alternarFormSenha(els, estado, !estado.formAberto);
    });

    els.btnCancelar.addEventListener('click', () => alternarFormSenha(els, estado, false));

    els.formSenha.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (bloquearSeConvidado() || els.btnSalvar.disabled) return;

        mostrarErro(els, '');
        const problema = validarTrocaSenha(els.inputAtual.value, els.inputNova.value, els.inputConfirmar.value);
        if (problema) {
            mostrarErro(els, t(problema));
            return;
        }
        els.btnSalvar.disabled = true;

        try {
            await trocarSenha(els.inputAtual.value, els.inputNova.value, els.inputConfirmar.value);
            showToast('Senha alterada com sucesso', 'success');
            alternarFormSenha(els, estado, false);
            await atualizarPainelAposTroca(els);
        } catch (erro) {
            mostrarErro(els, traduzirErro(erro, 'feedback.erro_alterar_senha'));
        } finally {
            els.btnSalvar.disabled = false;
        }
    });
}