import { getUsuario, subscribe as subscribeAuth } from '../../core/state/authStore.js';
import { subscribe as subscribeI18n, t } from '../../core/state/i18nStore.js';
import {
    definirPreferenciaInatividadeEditor,
    getPreferenciaInatividadeEditor,
    subscribePreferenciaInatividadeEditor,
} from '../../core/auth/sessionTimeout.js';

/**
 * "Sessão" card of the settings panel (editors only): optional client-only inactivity timeout, stored in this
 * browser. Administrators always have the 30-minute limit enforced by the API, so the card stays hidden for them.
 */
export function initSessaoConfig(): void {
    const card = document.getElementById('config-sessao-card');
    const switchEl = document.getElementById('config-sessao-switch') as HTMLButtonElement | null;
    const duracao = document.getElementById('config-sessao-duracao') as HTMLSelectElement | null;
    if (!card || !switchEl || !duracao) return;

    const pintar = (): void => {
        card.hidden = getUsuario()?.nivelAcesso !== 'EDITOR';
        const pref = getPreferenciaInatividadeEditor();
        switchEl.classList.toggle('active', pref.ativo);
        switchEl.setAttribute('aria-checked', String(pref.ativo));
        const rotulo = switchEl.querySelector<HTMLElement>('.config-switch-label');
        if (rotulo) rotulo.textContent = t(pref.ativo ? 'notif.ligado' : 'notif.desligado');
        duracao.value = String(pref.minutos);
        duracao.disabled = !pref.ativo;
    };

    switchEl.addEventListener('click', () => {
        definirPreferenciaInatividadeEditor({ ativo: !getPreferenciaInatividadeEditor().ativo });
    });
    duracao.addEventListener('change', () => {
        definirPreferenciaInatividadeEditor({ minutos: Number(duracao.value) });
    });

    pintar();
    subscribePreferenciaInatividadeEditor(pintar);
    subscribeAuth(pintar);
    subscribeI18n(pintar);
}
