import { isAdmin } from '../auth/permissions.js';
import { isAcessoConvidadoAutorizado, isAutenticado, subscribe as subscribeAuth } from '../state/authStore.js';
import { subscribe as subscribeI18n, t } from '../state/i18nStore.js';
import {
    EVENTO_PAINEL_ATIVADO,
    ROTA_INICIAL,
    ehHashApp,
    getDefinicaoRota,
    parseRota,
    rotaDoPainel,
    rotaDoSlug,
    serializarRota,
} from './appRoutes.js';
import type { DefinicaoRota, PainelAtivadoDetalhe, RotaApp, SlugRota } from './appRoutes.js';

/**
 * Hash router of the app shell. Each panel has a route "#app/<slug>" (see appRoutes.ts): sidebar links
 * update the URL (one history entry per navigation, so Back/Forward work), `hashchange` renders the
 * matching panel, a reload reopens it once the auth/guest bootstrap is done.
 */

export { EVENTO_PAINEL_ATIVADO };
export type { PainelAtivadoDetalhe };

const NOME_APP = 'eduAssets';
/** Main navigation (sidebar, also used as the mobile drawer, and the user menu inside it). */
const SELETOR_NAV_PRINCIPAL = '#sidebar .nav-link';

export interface OpcoesNavegacao {
    /** Inner tab, e.g. "historico" for the dashboard. */
    aba?: string;
    /** Replace the current history entry instead of adding one. */
    substituir?: boolean;
    /** Move focus to the panel heading (default true: user-initiated navigation). */
    focar?: boolean;
}

let rotaAtual: RotaApp | null = null;
/** Hash of the last rendered route; null while the URL is outside the app (#login, #termos…). */
let hashRenderizado: string | null = null;
let iniciado = false;

export function podeAcessarRota(rota: DefinicaoRota): boolean {
    if (rota.acesso === 'admin') return isAdmin();
    if (rota.acesso === 'autenticado') return isAutenticado();
    return true;
}

/** Applies the permission guard: a panel the current user may not open falls back to the home panel. */
function rotaPermitida(rota: RotaApp): RotaApp {
    return podeAcessarRota(getDefinicaoRota(rota.slug)) ? rota : { slug: ROTA_INICIAL };
}

/** Last panel route shown (kept while the URL is at #login, e.g. after the session expired). */
export function getRotaAtual(): RotaApp | null {
    return rotaAtual ? { ...rotaAtual } : null;
}

/** Hash of the last panel route shown ("#app/devolucoes"), or null before any panel was shown. */
export function getHashRotaAtual(): string | null {
    return rotaAtual ? serializarRota(rotaAtual) : null;
}

/** True once initNavigation ran: from then on panels are rendered by the router. */
export function isNavegacaoIniciada(): boolean {
    return iniciado;
}

/**
 * Forgets the last panel shown, so the next bare "#app" entry opens the home panel. Used on an explicit
 * sign-out: the next person who signs in on this tab must not land on the previous user's panel.
 */
export function esquecerRotaAtual(): void {
    rotaAtual = null;
}

/**
 * Opens a panel by slug (unknown slugs and forbidden panels open the home panel). Renders immediately and
 * records the route in the URL. Returns the route actually shown.
 */
export function navegarPara(slug: SlugRota | string, opcoes: OpcoesNavegacao = {}): RotaApp {
    const definicao = rotaDoSlug(slug);
    const pedida: RotaApp = definicao
        ? { slug: definicao.slug, ...(opcoes.aba && definicao.abas?.includes(opcoes.aba) ? { aba: opcoes.aba } : {}) }
        : { slug: ROTA_INICIAL };
    const rota = rotaPermitida(pedida);
    const hash = serializarRota(rota);

    renderizar(rota, opcoes.focar ?? true);
    hashRenderizado = hash;
    if (window.location.hash !== hash) {
        if (opcoes.substituir) substituirHash(hash);
        // Assigning location.hash adds a history entry and fires `hashchange` (Analytics listens to it);
        // the router ignores that event because the hash was already rendered.
        else window.location.hash = hash;
    }
    return { ...rota };
}

function substituirHash(hash: string): void {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`);
}

/** Renders the route in the current URL. Bare "#app" (entering the app) reopens the last panel shown. */
function aplicarHashAtual(focar: boolean): void {
    const hash = window.location.hash;
    const lida = parseRota(hash);
    if (!lida) return;

    const pedida: RotaApp = hash === '#app' && rotaAtual
        ? rotaAtual
        : { slug: lida.slug, ...(lida.aba ? { aba: lida.aba } : {}) };
    const rota = rotaPermitida(pedida);
    const canonico = serializarRota(rota);
    // Unknown slugs, forbidden panels and bare "#app" are rewritten without adding a history entry.
    if (hash !== canonico) substituirHash(canonico);

    renderizar(rota, focar);
    hashRenderizado = canonico;
}

function aoMudarHash(): void {
    const hash = window.location.hash;
    if (!ehHashApp(hash)) {
        hashRenderizado = null;
        return;
    }
    if (hash === hashRenderizado) return;
    // Without a session or guest choice the auth flow sends the visitor to #login.
    if (!isAutenticado() && !isAcessoConvidadoAutorizado()) return;
    // Focus moves only for navigation inside the app (links, Back/Forward), not when entering it from #login.
    aplicarHashAtual(hashRenderizado !== null);
}

function renderizar(rota: RotaApp, focar: boolean): void {
    const definicao = getDefinicaoRota(rota.slug);
    rotaAtual = { ...rota };
    const painel = ativarPainel(definicao.painelId);
    if (rota.aba) {
        const aba = painel?.querySelector<HTMLElement>(`[role="tab"][data-tab="${rota.aba}"]`);
        if (aba && !aba.classList.contains('active')) aba.click();
    }
    atualizarTitulo();
    if (focar && painel) focarTitulo(painel);
    document.dispatchEvent(new CustomEvent<PainelAtivadoDetalhe>(EVENTO_PAINEL_ATIVADO, {
        detail: { painelId: painel?.id ?? definicao.painelId, slug: rota.slug },
    }));
}

/** Shows one panel and marks the matching navigation links. Returns the panel shown. */
function ativarPainel(targetId: string): HTMLElement | null {
    const alvo = document.getElementById(targetId);
    const idFinal = alvo ? targetId : 'panel-404';

    document.querySelectorAll<HTMLElement>('.panel').forEach((panel) => panel.classList.remove('active'));
    const painel = document.getElementById(idFinal);
    painel?.classList.add('active');
    marcarLinksAtivos(idFinal);
    return painel;
}

function marcarLinksAtivos(painelId: string): void {
    document.querySelectorAll<HTMLElement>('.nav-link').forEach((item) => {
        item.classList.toggle('active', item.dataset.panel === painelId);
    });
    document.querySelectorAll<HTMLElement>(SELETOR_NAV_PRINCIPAL).forEach((item) => {
        if (item.dataset.panel === painelId) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
    });
}

function atualizarTitulo(): void {
    document.title = rotaAtual ? `${t(getDefinicaoRota(rotaAtual.slug).tituloChave)} · ${NOME_APP}` : NOME_APP;
}

function focarTitulo(painel: HTMLElement): void {
    const alvo = painel.querySelector<HTMLElement>('h1, h2') ?? painel;
    if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
    alvo.focus();
}

/** Gives every routed .nav-link a real href, so it can also be opened in a new tab or copied. */
function atualizarLinks(): void {
    document.querySelectorAll<HTMLAnchorElement>('a.nav-link[data-panel]').forEach((link) => {
        const rota = rotaDoPainel(link.dataset.panel ?? '');
        if (rota) link.setAttribute('href', serializarRota({ slug: rota.slug }));
    });
}

/** Keeps the dashboard tab in the URL ("#app/dashboard/historico") without adding history entries. */
function sincronizarAbaNaUrl(tab: HTMLElement): void {
    if (!rotaAtual || !ehHashApp(window.location.hash)) return;
    const definicao = getDefinicaoRota(rotaAtual.slug);
    const painel = document.getElementById(definicao.painelId);
    const nome = tab.dataset.tab ?? '';
    if (!painel?.contains(tab) || !definicao.abas?.includes(nome)) return;

    const rota: RotaApp = nome === definicao.abas[0] ? { slug: rotaAtual.slug } : { slug: rotaAtual.slug, aba: nome };
    rotaAtual = rota;
    const hash = serializarRota(rota);
    hashRenderizado = hash;
    if (window.location.hash !== hash) substituirHash(hash);
}

/** Re-checks the open panel after a sign-in/out (e.g. an editor must not stay on "Cadastros"). */
function aoMudarSessao(): void {
    atualizarLinks();
    if (rotaAtual) marcarLinksAtivos(getDefinicaoRota(rotaAtual.slug).painelId);
    if (!rotaAtual || !ehHashApp(window.location.hash)) return;
    if (podeAcessarRota(getDefinicaoRota(rotaAtual.slug))) return;
    navegarPara(ROTA_INICIAL, { substituir: true, focar: false });
}

function aoClicar(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const tab = target.closest<HTMLElement>('.dashboard-tab-link');
    if (tab) {
        sincronizarAbaNaUrl(tab);
        return;
    }

    const link = target.closest<HTMLElement>('.nav-link');
    if (!link) return;
    const targetId = link.dataset.panel;
    const rota = targetId ? rotaDoPainel(targetId) : null;
    // Ctrl/Cmd/Shift-click opens the route in a new tab or window.
    if (rota && (event.ctrlKey || event.metaKey || event.shiftKey)) return;

    event.preventDefault();
    if (!targetId) return;
    if (rota) {
        navegarPara(rota.slug);
        return;
    }
    // Panels without a route (e.g. panel-404) keep the previous behavior.
    const painel = ativarPainel(targetId);
    if (painel) focarTitulo(painel);
}

let cancelarAssinaturas: Array<() => void> = [];

export function initNavigation(): void {
    if (iniciado) return;
    iniciado = true;

    document.addEventListener('click', aoClicar);
    window.addEventListener('hashchange', aoMudarHash);
    window.addEventListener('popstate', aoMudarHash);
    cancelarAssinaturas = [subscribeI18n(atualizarTitulo), subscribeAuth(aoMudarSessao)];

    atualizarLinks();
    // Initial render (reload or entry): restore the panel in the URL, without moving focus.
    if (ehHashApp(window.location.hash)) {
        aplicarHashAtual(false);
    } else {
        renderizar({ slug: ROTA_INICIAL }, false);
    }
}

/** Test helper: removes the listeners and forgets the router state. */
export function __resetNavigationForTests(): void {
    document.removeEventListener('click', aoClicar);
    window.removeEventListener('hashchange', aoMudarHash);
    window.removeEventListener('popstate', aoMudarHash);
    cancelarAssinaturas.forEach((cancelar) => cancelar());
    cancelarAssinaturas = [];
    iniciado = false;
    rotaAtual = null;
    hashRenderizado = null;
}
