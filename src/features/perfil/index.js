import { getUsuario, subscribe } from '../../core/state/authStore.js';

export function initPerfil() {
    const painel = document.getElementById('panel-perfil');
    if (!painel) return;

    const nomeEl = document.getElementById('perfil-nome');
    const emailEl = document.getElementById('perfil-email');
    const nivelEl = document.getElementById('perfil-nivel');

    function render(usuario) {
        nomeEl.textContent = usuario?.nome ?? '—';
        emailEl.textContent = usuario?.login ?? '—';
        nivelEl.textContent = usuario?.nivelAcesso === 'ADMINISTRADOR'
            ? 'Administrador'
            : (usuario?.nivelAcesso === 'EDITOR' ? 'Editor' : '—');
    }

    render(getUsuario());
    subscribe(({ usuario }) => render(usuario));
}