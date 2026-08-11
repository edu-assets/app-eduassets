import { showToast } from '../../core/ui/index.js';
import { bloquearSeNaoAdmin } from '../../core/auth/guestGate.js';
import { getPreferenciaTema, definirTema } from '../../core/state/themeStore.js';
import { marcarTemaAtivo } from './render.js';
import type { TemaPreferencia } from './render.js';

export function attachConfigEvents(btnSalvar: HTMLElement): void {
    document.querySelectorAll<HTMLElement>('.config-switch').forEach((switchEl) => {
        switchEl.addEventListener('click', () => {
            const ativo = switchEl.classList.toggle('active');
            switchEl.setAttribute('aria-checked', String(ativo));
            const label = switchEl.querySelector<HTMLElement>('.config-switch-label');
            if (label) label.textContent = ativo ? 'Ativado' : 'Desativado';
        });
    });

    btnSalvar.addEventListener('click', () => {
        if (bloquearSeNaoAdmin()) return;
        showToast('Configurações salvas com sucesso', 'success');
    });
}

export function attachTemaToggle(grupoTema: HTMLElement): void {
    const botoes = grupoTema.querySelectorAll<HTMLElement>('.config-toggle-btn');
    marcarTemaAtivo(grupoTema, getPreferenciaTema());

    botoes.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tema = btn.dataset.tema as TemaPreferencia;
            definirTema(tema);
            marcarTemaAtivo(grupoTema, tema);
        });
    });
}