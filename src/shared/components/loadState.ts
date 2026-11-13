import { html } from '../../core/utils/html.js';
import { t } from '../../core/state/i18nStore.js';
import { tentarNovamente } from '../../core/state/loadStatus.js';
import type { ChaveCarga, EstadoCarga } from '../../core/state/loadStatus.js';

/** Linhas-esqueleto (decorativas) exibidas durante a carga inicial. */
export function renderSkeletonLinhas(quantidade = 4, classe = ''): string {
    const linha = html`<div class="skeleton-linha ${classe}" aria-hidden="true"><span class="skeleton-bloco skeleton-bloco--curto"></span><span class="skeleton-bloco"></span><span class="skeleton-bloco skeleton-bloco--medio"></span></div>`;
    return linha.repeat(quantidade);
}

export function renderErroCarga(): string {
    return html`
        <div class="load-error" role="alert">
            <span class="material-symbols-outlined" aria-hidden="true">cloud_off</span>
            <p class="load-error-texto">${t('loadstate.erro_carregar')}</p>
            <button type="button" class="btn btn-neutral load-error-retry" data-load-retry>${t('loadstate.tentar_novamente')}</button>
        </div>
    `;
}

/** Valor de contador enquanto os dados ainda não chegaram (ou falharam): "—" em vez de "0". */
export const CONTADOR_INDISPONIVEL = '—';

export function semDadosProntos(estado: EstadoCarga): boolean {
    return estado === 'carregando' || estado === 'erro';
}

/**
 * Pinta o esqueleto (carregando) ou o erro no container e marca aria-busy.
 * Retorna true quando o container foi tratado — o chamador não deve renderizar a lista/estado vazio.
 */
export function aplicarEstadoCarga(container: HTMLElement, estado: EstadoCarga, skeleton: string, prefixo = ''): boolean {
    if (estado === 'carregando') {
        container.setAttribute('aria-busy', 'true');
        container.innerHTML = prefixo + skeleton;
        return true;
    }
    container.removeAttribute('aria-busy');
    if (estado === 'erro') {
        container.innerHTML = prefixo + renderErroCarga();
        return true;
    }
    return false;
}

/** Delegação do botão "Tentar novamente" dentro do container; `chaves` pode ser fixa ou escolhida pelo botão. */
export function ligarTentarNovamente(
    container: HTMLElement,
    chave: ChaveCarga | ((botao: HTMLElement) => ChaveCarga),
    tentar: (chave: ChaveCarga) => Promise<void> | void = tentarNovamente
): void {
    container.addEventListener('click', (evento) => {
        const botao = (evento.target as HTMLElement).closest<HTMLElement>('[data-load-retry]');
        if (!botao || !container.contains(botao)) return;
        void tentar(typeof chave === 'function' ? chave(botao) : chave);
    });
}

