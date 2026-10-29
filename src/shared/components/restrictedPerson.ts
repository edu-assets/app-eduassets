import { isAcessoConvidadoAutorizado } from '../../core/state/authStore.js';
import { html } from '../../core/utils/html.js';
import { t } from '../../core/state/i18nStore.js';

/** Renderiza apenas o estado de acesso, sem manter o nome protegido no HTML do convidado. */
export function renderPessoaProtegida(valor: string): string {
    if (!isAcessoConvidadoAutorizado()) return html`${valor}`;

    return html`
        <span class="dado-restrito" role="img" aria-label="${t('auth.informacao_restrita')}">
            <span class="material-symbols-outlined" aria-hidden="true">lock</span>
            <span>${t('auth.dado_restrito')}</span>
        </span>
    `;
}

export function renderIniciaisProtegidas(valor: string): string {
    if (!isAcessoConvidadoAutorizado()) return valor;
    return '<span class="material-symbols-outlined" aria-hidden="true">lock</span>';
}
