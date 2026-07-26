export function renderAuthStatus(els, autenticado, usuario) {
    els.badgeLabel.textContent = autenticado ? `Admin: ${usuario.nome}` : 'Modo Convidado';
    els.badge.classList.toggle('auth-status-badge-admin', autenticado);
    els.toggleBtn.textContent = autenticado ? 'Sair' : 'Login';
    document.body.classList.toggle('guest-mode', !autenticado);
}

export function mostrarErroLogin(els, mensagem) {
    els.erro.textContent = mensagem;
    els.erro.style.display = mensagem ? 'block' : 'none';
}