import type { AuthUser } from '../../types/index.js';

export interface PerfilEls {
    nomeEl: HTMLElement | null;
    emailEl: HTMLElement | null;
    nivelEl: HTMLElement | null;
}

export function renderPerfil(els: PerfilEls, usuario: AuthUser | null): void {
    if (els.nomeEl) els.nomeEl.textContent = usuario?.nome ?? '—';
    if (els.emailEl) els.emailEl.textContent = usuario?.login ?? '—';
    if (els.nivelEl) {
        els.nivelEl.textContent = usuario?.nivelAcesso === 'ADMINISTRADOR'
            ? 'Administrador'
            : (usuario?.nivelAcesso === 'EDITOR' ? 'Editor' : '—');
    }
}