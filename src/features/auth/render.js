import { renderUserMenuAutenticado, renderUserMenuConvidado } from './templates.js';

export function renderAuthStatus(els, autenticado, usuario) {
    els.sidebarFooter.classList.toggle('user-menu', autenticado);
    els.sidebarFooter.innerHTML = autenticado
        ? renderUserMenuAutenticado(usuario)
        : renderUserMenuConvidado();

    document.body.classList.toggle('guest-mode', !autenticado);

    renderHeroButton(els, autenticado);
}

export function renderHeroButton(els, autenticado) {
    if (!els.btnHeroLogin) return;

    els.btnHeroLogin.classList.toggle('btn-primary', !autenticado);
    els.btnHeroLogin.classList.toggle('btn-neutral', autenticado);

    els.btnHeroLogin.innerHTML = autenticado
        ? '<span class="material-symbols-outlined">logout</span> Sair'
        : '<span class="material-symbols-outlined">login</span> Login';
}

export function mostrarErroLogin(els, mensagem) {
    els.erro.textContent = mensagem;
    els.erro.style.display = mensagem ? 'block' : 'none';
}