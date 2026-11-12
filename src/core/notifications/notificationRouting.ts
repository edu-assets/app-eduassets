import { isAdmin } from '../auth/permissions.js';

/**
 * Maps notification target URLs (e.g. "/#panel-controle") to an app panel and opens it through the
 * existing sidebar navigation (.nav-link[data-panel]); the app has no hash router of its own.
 */
const PAINEIS_PERMITIDOS = new Set([
    'panel-inicio',
    'panel-emprestimo',
    'panel-devolucao',
    'panel-dashboard',
    'panel-controle'
]);

// Short aliases accepted in the URL; loans, returns and incidents are all reviewed in "Controle".
const ALIAS: Record<string, string> = {
    controle: 'panel-controle',
    emprestimos: 'panel-controle',
    devolucoes: 'panel-controle',
    ocorrencias: 'panel-controle'
};

let painelPendente: string | null = null;

export function painelDaUrlNotificacao(url: unknown): string | null {
    if (typeof url !== 'string' || !url) return null;
    let alvo: URL;
    try {
        alvo = new URL(url, 'https://app.invalid');
    } catch {
        return null;
    }
    const candidato = (alvo.hash.replace(/^#/, '') || alvo.searchParams.get('painel') || alvo.searchParams.get('panel') || '')
        .trim()
        .toLowerCase();
    if (!candidato) return null;
    const painel = ALIAS[candidato] ?? candidato;
    return PAINEIS_PERMITIDOS.has(painel) ? painel : null;
}

/** Remembers the panel from the URL the app was opened with, before the entry route rewrites the hash. */
export function capturarPainelDaUrlInicial(): void {
    painelPendente = painelDaUrlNotificacao(window.location.hash || window.location.search);
}

/** Opens the pending panel once an administrator session is available. */
export function aplicarPainelPendente(): void {
    if (!painelPendente || !isAdmin()) return;
    const link = document.querySelector<HTMLElement>(`.nav-link[data-panel="${painelPendente}"]`);
    painelPendente = null;
    link?.click();
}

export function abrirPainelDaNotificacao(url: unknown): void {
    const painel = painelDaUrlNotificacao(url);
    if (!painel) return;
    painelPendente = painel;
    aplicarPainelPendente();
}

export function descartarPainelPendente(): void {
    painelPendente = null;
}
