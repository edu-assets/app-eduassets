import { iniciarSessao, isAutenticado, getUsuario } from '../../core/state/authStore.js';
import { openModal } from '../../core/ui/index.js';
import { attachAuthEvents } from './events.js';
import { renderAuthStatus } from './render.js';
import type { AuthEls } from './render.js';

export async function initAuth(): Promise<void> {
    const sidebarFooter = document.getElementById('sidebar-footer');
    if (!sidebarFooter) return;

    let liberarEntrada!: () => void;
    const escolhaInicial = new Promise<void>((resolve) => {
        liberarEntrada = resolve;
    });

    const els: AuthEls = {
        sidebarFooter,
        btnHeroLogin: document.getElementById('btn-abrir-login-hero'),
        form: document.getElementById('login-form') as HTMLFormElement,
        emailInput: document.getElementById('login-email') as HTMLInputElement,
        senhaInput: document.getElementById('login-senha') as HTMLInputElement,
        erro: document.getElementById('login-erro') as HTMLElement,
        btnEntrar: document.getElementById('login-btn-entrar') as HTMLButtonElement,
        btnContinuarConvidado: document.getElementById('login-continuar-convidado') as HTMLButtonElement
    };

    attachAuthEvents(els, liberarEntrada);
    await iniciarSessao();
    renderAuthStatus(els, isAutenticado(), getUsuario());
    if (!isAutenticado()) {
        openModal('modal-login');
        els.emailInput.focus();
        await escolhaInicial;
    }
}
