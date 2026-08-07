import { iniciarSessao, isAutenticado, getUsuario } from '../../core/state/authStore.js';
import { attachAuthEvents } from './events.js';
import { renderAuthStatus } from './render.js';
import type { AuthEls } from './render.js';

export async function initAuth(): Promise<void> {
    const sidebarFooter = document.getElementById('sidebar-footer');
    if (!sidebarFooter) return;

    const els: AuthEls = {
        sidebarFooter,
        btnHeroLogin: document.getElementById('btn-abrir-login-hero'),
        emailInput: document.getElementById('login-email') as HTMLInputElement,
        senhaInput: document.getElementById('login-senha') as HTMLInputElement,
        erro: document.getElementById('login-erro') as HTMLElement,
        btnEntrar: document.getElementById('login-btn-entrar') as HTMLButtonElement,
        btnContinuarConvidado: document.getElementById('login-continuar-convidado') as HTMLElement
    };

    attachAuthEvents(els);
    await iniciarSessao();
    renderAuthStatus(els, isAutenticado(), getUsuario());
}