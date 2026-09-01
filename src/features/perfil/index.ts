import { getUsuario, subscribe } from '../../core/state/authStore.js';
import { subscribe as subscribeI18n } from '../../core/state/i18nStore.js';
import { renderPerfil } from './render.js';
import type { PerfilEls } from './render.js';

export function initPerfil(): void {
    const painel = document.getElementById('panel-perfil');
    if (!painel) return;

    const els: PerfilEls = {
        nomeEl: document.getElementById('perfil-nome'),
        emailEl: document.getElementById('perfil-email'),
        nivelEl: document.getElementById('perfil-nivel')
    };

    renderPerfil(els, getUsuario());
    subscribe(({ usuario }) => renderPerfil(els, usuario));
    subscribeI18n(() => renderPerfil(els, getUsuario()));
}