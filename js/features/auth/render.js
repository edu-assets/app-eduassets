export function renderAuthStatus(els, autenticado, usuario) {
    els.badgeLabel.innerHTML = autenticado ? `<span class="usuario-nome">${usuario.nome}</span> Administrador` : 'Modo Convidado';
    els.badge.classList.toggle('auth-status-badge-admin', autenticado);
    els.toggleBtn.innerHTML = autenticado ? '<span class="material-symbols-outlined">logout</span> Sair' : '<span class="material-symbols-outlined">login</span> Login';
    document.body.classList.toggle('guest-mode', !autenticado);
}

export function mostrarErroLogin(els, mensagem) {
    els.erro.textContent = mensagem;
    els.erro.style.display = mensagem ? 'block' : 'none';
}