import { getUsuario, subscribe } from '../../core/state/authStore.js';
import type { AuthUser } from '../../types/index.js';

export function initPerfil(): void {
    const painel = document.getElementById('panel-perfil');
    if (!painel) return;

    const nomeEl = document.getElementById('perfil-nome');
    const emailEl = document.getElementById('perfil-email');
    const nivelEl = document.getElementById('perfil-nivel');

    function render(usuario: AuthUser | null): void {
        if (nomeEl) nomeEl.textContent = usuario?.nome ?? '—';
        if (emailEl) emailEl.textContent = usuario?.login ?? '—';
        if (nivelEl) {
            nivelEl.textContent = usuario?.nivelAcesso === 'ADMINISTRADOR'
                ? 'Administrador'
                : (usuario?.nivelAcesso === 'EDITOR' ? 'Editor' : '—');
        }
    }

    render(getUsuario());
    subscribe(({ usuario }) => render(usuario));
}