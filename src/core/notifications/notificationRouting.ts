import { isAdmin } from '../auth/permissions.js';
import { parseRota, getDefinicaoRota, rotaDoPainel } from '../layout/appRoutes.js';
import { navegarPara } from '../layout/navigation.js';

/**
 * Maps notification target URLs (e.g. "/#app/controle", legacy "/#panel-controle") to an app panel and
 * opens it through the hash router ("#app/<slug>").
 */
const PAINEIS_PERMITIDOS = new Set([
    'panel-inicio',
    'panel-emprestimo',
    'panel-devolucao',
    'panel-dashboard',
    'panel-controle'
]);

// Short aliases accepted in the URL: loans and returns are reviewed in the Dashboard (history tab),
// incidents in "Controle". "#panel-controle" stays valid for notifications delivered before this mapping.
const ALIAS: Record<string, string> = {
    controle: 'panel-controle',
    ocorrencias: 'panel-controle',
    emprestimos: 'panel-dashboard',
    devolucoes: 'panel-dashboard'
};

// Panels opened from a notification that must also land on a specific inner tab.
const ABA_POR_PAINEL: Record<string, string> = {
    'panel-dashboard': 'historico'
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
    const rotaApp = parseRota(`#${candidato}`);
    const painelDaRota = rotaApp && !rotaApp.desconhecida && candidato !== 'app'
        ? getDefinicaoRota(rotaApp.slug).painelId
        : null;
    const painel = painelDaRota ?? ALIAS[candidato] ?? candidato;
    return PAINEIS_PERMITIDOS.has(painel) ? painel : null;
}

/** Remembers the panel from the URL the app was opened with, before the entry route rewrites the hash. */
export function capturarPainelDaUrlInicial(): void {
    painelPendente = painelDaUrlNotificacao(window.location.hash || window.location.search);
}

/** Opens the pending panel once an administrator session is available. */
export function aplicarPainelPendente(): void {
    if (!painelPendente || !isAdmin()) return;
    const painel = painelPendente;
    painelPendente = null;
    const rota = rotaDoPainel(painel);
    if (!rota) return;
    const aba = ABA_POR_PAINEL[painel];
    navegarPara(rota.slug, aba ? { aba } : {});
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
