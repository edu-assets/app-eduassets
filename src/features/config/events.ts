import { showToast } from '../../core/ui/index.js';
import { bloquearSeNaoAdmin } from '../../core/auth/guestGate.js';
import { getPreferenciaTema, getTemaResolvido, definirTema, subscribe as subscribeTema } from '../../core/state/themeStore.js';
import { getIdioma, definirIdioma, subscribe as subscribeI18n, t } from '../../core/state/i18nStore.js';
import { marcarTemaAtivo, marcarIdiomaAtivo } from './render.js';
import type { IdiomaPreferencia } from './render.js';

let idiomaSwapTimers: number[] = [];

function limparIdiomaSwapTimers(): void {
    idiomaSwapTimers.forEach((timer) => window.clearTimeout(timer));
    idiomaSwapTimers = [];
}

function animarTrocaIdioma(grupoIdioma: HTMLElement, idioma: IdiomaPreferencia): void {
    const painel = grupoIdioma.closest<HTMLElement>('#panel-config');
    if (!painel) {
        definirIdioma(idioma);
        marcarIdiomaAtivo(grupoIdioma, idioma);
        return;
    }

    limparIdiomaSwapTimers();
    painel.classList.add('config-panel--language-switching');

    idiomaSwapTimers.push(window.setTimeout(() => {
        definirIdioma(idioma);
        marcarIdiomaAtivo(grupoIdioma, idioma);
    }, 120));

    idiomaSwapTimers.push(window.setTimeout(() => {
        painel.classList.remove('config-panel--language-switching');
        limparIdiomaSwapTimers();
    }, 280));
}

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
    const toggle = grupoTema.querySelector<HTMLButtonElement>('[data-config-theme-toggle]');
    const systemButton = grupoTema.querySelector<HTMLButtonElement>('[data-tema="system"]');

    const sincronizarEstado = (): void => {
        marcarTemaAtivo(grupoTema, getPreferenciaTema());
        if (!toggle) return;
        const temaEscuro = getTemaResolvido() === 'dark';
        const label = t(temaEscuro ? 'auth.tema_ativar_claro' : 'auth.tema_ativar_escuro');
        toggle.setAttribute('aria-pressed', String(temaEscuro));
        toggle.setAttribute('aria-label', label);
        toggle.title = label;
    };

    toggle?.addEventListener('click', () => {
        definirTema(getTemaResolvido() === 'dark' ? 'light' : 'dark');
    });
    systemButton?.addEventListener('click', () => definirTema('system'));

    sincronizarEstado();
    subscribeTema(sincronizarEstado);
    subscribeI18n(sincronizarEstado);
}

export function attachIdiomaToggle(grupoIdioma: HTMLElement): void {
    const botoes = grupoIdioma.querySelectorAll<HTMLElement>('.config-toggle-btn');
    marcarIdiomaAtivo(grupoIdioma, getIdioma());

    botoes.forEach((btn) => {
        btn.addEventListener('click', () => {
            const idioma = btn.dataset.idioma as IdiomaPreferencia;
            if (idioma === getIdioma()) return;
            animarTrocaIdioma(grupoIdioma, idioma);
        });
    });

    subscribeI18n(() => marcarIdiomaAtivo(grupoIdioma, getIdioma()));
}
