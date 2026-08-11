import { renderUserMenuAutenticado, renderUserMenuConvidado } from './templates.js';
import type { AuthUser } from '../../types/index.js';

export interface AuthEls {
    sidebarFooter: HTMLElement;
    btnHeroLogin: HTMLElement | null;
    emailInput: HTMLInputElement;
    senhaInput: HTMLInputElement;
    erro: HTMLElement;
    btnEntrar: HTMLButtonElement;
    btnContinuarConvidado: HTMLElement;
}

export function renderAuthStatus(els: AuthEls, autenticado: boolean, usuario: AuthUser | null): void {
    els.sidebarFooter.classList.toggle('user-menu', autenticado);
    els.sidebarFooter.innerHTML = autenticado && usuario
        ? renderUserMenuAutenticado(usuario)
        : renderUserMenuConvidado();

    document.body.classList.toggle('guest-mode', !autenticado);
    document.body.classList.toggle('editor-mode', autenticado && usuario?.nivelAcesso === 'EDITOR');

    renderHeroButton(els, autenticado);
}

export function renderHeroButton(els: AuthEls, autenticado: boolean): void {
    if (!els.btnHeroLogin) return;

    els.btnHeroLogin.classList.toggle('btn-primary', !autenticado);
    els.btnHeroLogin.classList.toggle('btn-neutral', autenticado);

    els.btnHeroLogin.innerHTML = autenticado
        ? '<span class="material-symbols-outlined">logout</span> Sair'
        : '<span class="material-symbols-outlined">login</span> Login';
}

export function mostrarErroLogin(els: AuthEls, mensagem: string): void {
    els.erro.textContent = mensagem;
    els.erro.style.display = mensagem ? 'block' : 'none';
}