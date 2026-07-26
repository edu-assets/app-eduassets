import { iniciarSessao, isAutenticado, getUsuario } from '../../core/state/authStore.js';
import { attachAuthEvents } from './events.js';
import { renderAuthStatus } from './render.js';

export async function initAuth() {
    const els = {
        badge: document.getElementById('auth-status-badge'),
        badgeLabel: document.getElementById('auth-status-label'),
        toggleBtn: document.getElementById('btn-auth-toggle'),
        btnHeroLogin: document.getElementById('btn-abrir-login-hero'),
        emailInput: document.getElementById('login-email'),
        senhaInput: document.getElementById('login-senha'),
        erro: document.getElementById('login-erro'),
        btnEntrar: document.getElementById('login-btn-entrar'),
        btnContinuarConvidado: document.getElementById('login-continuar-convidado')
    };

    // Check if the required elements exist
    if (!els.toggleBtn) return;

    attachAuthEvents(els);
    await iniciarSessao();
    renderAuthStatus(els, isAutenticado(), getUsuario());
}