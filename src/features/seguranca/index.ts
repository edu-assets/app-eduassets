import { getUsuario, subscribe } from '../../core/state/authStore.js';
import { attachSegurancaEvents } from './events.js';
import { renderInfoConta, habilitarProtecaoAutofill } from './render.js';
import type { SegurancaEls, SegurancaEstado } from './render.js';

export function initSeguranca(): void {
    const painel = document.getElementById('panel-seguranca');
    if (!painel) return;

    const els: SegurancaEls = {
        email: document.getElementById('seguranca-email'),
        btnToggleSenha: document.getElementById('seguranca-toggle-senha') as HTMLElement,
        formSenha: document.getElementById('seguranca-form-senha') as HTMLElement,
        inputAtual: document.getElementById('seguranca-senha-atual') as HTMLInputElement,
        inputNova: document.getElementById('seguranca-senha-nova') as HTMLInputElement,
        inputConfirmar: document.getElementById('seguranca-senha-confirmar') as HTMLInputElement,
        erro: document.getElementById('seguranca-senha-erro'),
        btnSalvar: document.getElementById('seguranca-senha-salvar') as HTMLButtonElement,
        btnCancelar: document.getElementById('seguranca-senha-cancelar') as HTMLElement
    };

    const estado: SegurancaEstado = { formAberto: false };

    renderInfoConta(els, getUsuario());
    subscribe(({ usuario }) => renderInfoConta(els, usuario));
    attachSegurancaEvents(els, estado);

    habilitarProtecaoAutofill(els);

    requestAnimationFrame(() => {
        els.inputAtual.value = '';
        els.inputNova.value = '';
        els.inputConfirmar.value = '';
    });
}