import { getUsuario, subscribe } from '../../core/state/authStore.js';
import { attachSegurancaEvents } from './events.js';
import { renderInfoConta } from './render.js';

export function initSeguranca() {
    const painel = document.getElementById('panel-seguranca');
    if (!painel) return;

    const els = {
        email: document.getElementById('seguranca-email'),
        btnToggleSenha: document.getElementById('seguranca-toggle-senha'),
        formSenha: document.getElementById('seguranca-form-senha'),
        inputAtual: document.getElementById('seguranca-senha-atual'),
        inputNova: document.getElementById('seguranca-senha-nova'),
        inputConfirmar: document.getElementById('seguranca-senha-confirmar'),
        erro: document.getElementById('seguranca-senha-erro'),
        btnSalvar: document.getElementById('seguranca-senha-salvar'),
        btnCancelar: document.getElementById('seguranca-senha-cancelar')
    };

    const estado = { formAberto: false };

    renderInfoConta(els, getUsuario());
    subscribe(({ usuario }) => renderInfoConta(els, usuario));
    attachSegurancaEvents(els, estado);
}