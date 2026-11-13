/**
 * Hash routes of the app shell: "#app/<slug>" opens one panel (".panel" section). Pure data and parsing,
 * shared by the router (navigation.ts), the entry route and the Analytics allowlist.
 */
export const APP_ROUTE_PREFIX = '#app';

/** Dispatched on `document` by the router whenever a panel is shown. */
export const EVENTO_PAINEL_ATIVADO = 'eduassets:painel-ativado';

export type SlugRota =
    | 'inicio'
    | 'emprestimo'
    | 'devolucoes'
    | 'dashboard'
    | 'controle'
    | 'cadastros'
    | 'exportar'
    | 'configuracoes'
    | 'sobre'
    | 'seguranca'
    | 'perfil';

/** Who may open a panel: everyone in the app (guest included), signed-in users, or administrators. */
export type AcessoRota = 'todos' | 'autenticado' | 'admin';

export interface DefinicaoRota {
    slug: SlugRota;
    painelId: string;
    /** i18n key of the panel name, used in document.title. */
    tituloChave: string;
    acesso: AcessoRota;
    /** Inner tabs that may follow the slug ("#app/dashboard/historico"). */
    abas?: readonly string[];
}

export interface PainelAtivadoDetalhe {
    painelId: string;
    slug: SlugRota | null;
}

export const ROTA_INICIAL: SlugRota = 'inicio';

export const ROTAS: readonly DefinicaoRota[] = [
    { slug: 'inicio', painelId: 'panel-inicio', tituloChave: 'shell.inicio', acesso: 'todos' },
    { slug: 'emprestimo', painelId: 'panel-emprestimo', tituloChave: 'shell.novo_emprestimo', acesso: 'todos' },
    { slug: 'devolucoes', painelId: 'panel-devolucao', tituloChave: 'shell.devolucoes', acesso: 'todos' },
    { slug: 'dashboard', painelId: 'panel-dashboard', tituloChave: 'shell.dashboard', acesso: 'todos', abas: ['estoque', 'historico'] },
    { slug: 'controle', painelId: 'panel-controle', tituloChave: 'shell.controle', acesso: 'todos' },
    { slug: 'cadastros', painelId: 'panel-cadastros', tituloChave: 'shell.cadastros', acesso: 'admin' },
    { slug: 'exportar', painelId: 'panel-exportar', tituloChave: 'shell.exportar', acesso: 'todos' },
    { slug: 'configuracoes', painelId: 'panel-config', tituloChave: 'shell.configuracoes', acesso: 'todos' },
    { slug: 'sobre', painelId: 'panel-sobre', tituloChave: 'shell.sobre', acesso: 'todos' },
    { slug: 'seguranca', painelId: 'panel-seguranca', tituloChave: 'shell.seguranca_da_conta', acesso: 'autenticado' },
    { slug: 'perfil', painelId: 'panel-perfil', tituloChave: 'auth.meu_perfil', acesso: 'autenticado' },
];

const ROTA_POR_SLUG = new Map<string, DefinicaoRota>(ROTAS.map((rota) => [rota.slug, rota]));
const ROTA_POR_PAINEL = new Map<string, DefinicaoRota>(ROTAS.map((rota) => [rota.painelId, rota]));

export interface RotaApp {
    slug: SlugRota;
    aba?: string;
}

export function getDefinicaoRota(slug: SlugRota): DefinicaoRota {
    return ROTA_POR_SLUG.get(slug)!;
}

export function rotaDoSlug(slug: string): DefinicaoRota | null {
    return ROTA_POR_SLUG.get(slug) ?? null;
}

export function rotaDoPainel(painelId: string): DefinicaoRota | null {
    return ROTA_POR_PAINEL.get(painelId) ?? null;
}

/** True for "#app" and anything below it ("#app/…"), known or not. */
export function ehHashApp(hash: string): boolean {
    return hash === APP_ROUTE_PREFIX || hash.startsWith(`${APP_ROUTE_PREFIX}/`);
}

/**
 * Reads an app hash. "#app" and "#app/" open the home panel; an unknown slug or tab is reported as
 * `desconhecida` so the router can fall back to the home panel. Non-app hashes (#login, the recovery
 * token…) return null.
 */
export function parseRota(hash: string): (RotaApp & { desconhecida: boolean }) | null {
    if (!ehHashApp(hash)) return null;
    const segmentos = hash.slice(APP_ROUTE_PREFIX.length + 1).split('/').filter(Boolean);
    if (segmentos.length === 0) return { slug: ROTA_INICIAL, desconhecida: false };

    const rota = rotaDoSlug(segmentos[0]!);
    if (!rota || segmentos.length > 2) return { slug: ROTA_INICIAL, desconhecida: true };
    if (segmentos.length === 1) return { slug: rota.slug, desconhecida: false };

    const aba = segmentos[1]!;
    if (!rota.abas?.includes(aba)) return { slug: rota.slug, desconhecida: true };
    return { slug: rota.slug, aba, desconhecida: false };
}

export function serializarRota(rota: RotaApp): string {
    const definicao = rotaDoSlug(rota.slug);
    const slug = definicao ? definicao.slug : ROTA_INICIAL;
    const aba = rota.aba && definicao?.abas?.includes(rota.aba) ? `/${rota.aba}` : '';
    return `${APP_ROUTE_PREFIX}/${slug}${aba}`;
}

/** Every app hash that may be reported (e.g. to Analytics): fixed list, no free-form values. */
export const HASHES_APP_CONHECIDOS: ReadonlySet<string> = new Set([
    APP_ROUTE_PREFIX,
    ...ROTAS.flatMap((rota) => [
        serializarRota({ slug: rota.slug }),
        ...(rota.abas ?? []).map((aba) => serializarRota({ slug: rota.slug, aba })),
    ]),
]);
