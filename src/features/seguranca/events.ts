import { showToast } from '../../core/ui/index.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';
import { trocarSenha } from './service.js';
import { alternarFormSenha, mostrarErro } from './render.js';
import type { SegurancaEls, SegurancaEstado } from './render.js';

export function attachSegurancaEvents(els: SegurancaEls, estado: SegurancaEstado): void {
    els.btnToggleSenha.addEventListener('click', () => {
        if (bloquearSeConvidado()) return;
        alternarFormSenha(els, estado, !estado.formAberto);
    });

    els.btnCancelar.addEventListener('click', () => alternarFormSenha(els, estado, false));

    els.btnSalvar.addEventListener('click', async () => {
        if (bloquearSeConvidado()) return;

        mostrarErro(els, '');
        els.btnSalvar.disabled = true;

        try {
            await trocarSenha(els.inputAtual.value, els.inputNova.value, els.inputConfirmar.value);
            showToast('Senha alterada com sucesso', 'success');
            alternarFormSenha(els, estado, false);
        } catch (erro) {
            mostrarErro(els, erro instanceof Error ? erro.message : 'Erro ao alterar senha.');
        } finally {
            els.btnSalvar.disabled = false;
        }
    });
}