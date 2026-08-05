import { iniciarSessao, isAutenticado, getUsuario } from '../../core/state/authStore.js';
import { attachAuthEvents } from './events.js';
import { renderAuthStatus } from './render.js';

export async function initAuth() {
    const els = {
        sidebarFooter: document.getElementById('sidebar-footer'),
        btnHeroLogin: document.getElementById('btn-abrir-login-hero'),
        emailInput: document.getElementById('login-email'),
        senhaInput: document.getElementById('login-senha'),
        erro: document.getElementById('login-erro'),
        btnEntrar: document.getElementById('login-btn-entrar'),
        btnContinuarConvidado: document.getElementById('login-continuar-convidado')
    };

    if (!els.sidebarFooter) return;

    attachAuthEvents(els);
    await iniciarSessao();
    renderAuthStatus(els, isAutenticado(), getUsuario());
}