import { renderUserMenuAutenticado, renderUserMenuConvidado } from './templates.js';

export function renderAuthStatus(els, autenticado, usuario) {
    els.sidebarFooter.classList.toggle('user-menu', autenticado);
    els.sidebarFooter.innerHTML = autenticado
        ? renderUserMenuAutenticado(usuario)
        : renderUserMenuConvidado();

    document.body.classList.toggle('guest-mode', !autenticado);
}

export function mostrarErroLogin(els, mensagem) {
    els.erro.textContent = mensagem;
    els.erro.style.display = mensagem ? 'block' : 'none';
}