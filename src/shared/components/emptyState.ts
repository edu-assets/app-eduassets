import { html, raw } from '../../core/utils/html.js';
import { t } from '../../core/state/i18nStore.js';

type TagOuNulo = string | null;

export interface EmptyStateOpcoes {
    containerClass?: string;
    icon?: string;
    imageSrc?: string;
    imageAlt?: string;
    imageClass?: string;
    iconClass?: string;
    titulo?: string;
    tituloTag?: TagOuNulo;
    tituloClass?: string;
    subtitulo?: string;
    subtituloTag?: TagOuNulo;
    subtituloClass?: string;
}

function renderTexto(texto: string | undefined, tag: TagOuNulo, classe: string | undefined): string {
    if (!texto) return '';
    if (!tag) return html`${texto}`;
    return html`<${raw(tag)} class="${classe || ''}">${texto}</${raw(tag)}>`;
}

function renderMidia(
    imageSrc: string | undefined,
    imageAlt: string,
    imageClass: string,
    icon: string | undefined,
    iconClass: string
): string {
    if (imageSrc) {
        return html`<img src="${imageSrc}" alt="${imageAlt}" class="${imageClass}">`;
    }
    if (icon) {
        return html`
            <span class="icon-badge icon-badge--lg icon-badge--neutral ${iconClass}">
                <span class="material-symbols-outlined">${icon}</span>
            </span>
        `;
    }
    return '';
}

export function renderEmptyState({
    containerClass = '',
    icon,
    imageSrc,
    imageAlt = '',
    imageClass = '',
    iconClass = '',
    titulo,
    tituloTag = 'p',
    tituloClass = '',
    subtitulo,
    subtituloTag = 'p',
    subtituloClass = ''
}: EmptyStateOpcoes): string {
    const midia = renderMidia(imageSrc, imageAlt, imageClass, icon, iconClass);
    const tituloHtml = renderTexto(titulo, tituloTag, tituloClass);
    const subtituloHtml = renderTexto(subtitulo, subtituloTag, subtituloClass);

    return html`
        <div class="${containerClass}">
            ${raw(midia)}
            ${raw(tituloHtml)}
            ${raw(subtituloHtml)}
        </div>
    `;
}


export interface SemResultadosOpcoes {
    /** Texto buscado; vazio quando só há filtros ativos. */
    consulta?: string;
    /** 'busca' => botão "Limpar busca"; 'filtros' => "Limpar filtros". */
    limpar?: 'busca' | 'filtros';
    containerClass?: string;
    tituloClass?: string;
    botaoClass?: string;
}

/** Estado vazio de "sem resultados" (busca/filtros ativos) com botão `data-limpar-busca`. A consulta é escapada. */
export function renderEmptyStateSemResultados({
    consulta = '',
    limpar = 'busca',
    containerClass = '',
    tituloClass = '',
    botaoClass = 'btn btn-neutral btn-sm'
}: SemResultadosOpcoes = {}): string {
    const termo = consulta.trim();
    const titulo = termo
        ? t('shell.nenhum_resultado_para').replace('{q}', termo)
        : t('shell.nenhum_resultado_filtros_atuais');
    const rotulo = limpar === 'filtros' ? t('shell.limpar_filtros') : t('shell.limpar_busca');
    return html`
        <div class="${containerClass}" data-estado-vazio="sem-resultados">
            <span class="icon-badge icon-badge--lg icon-badge--neutral"><span class="material-symbols-outlined">search_off</span></span>
            <p class="${tituloClass}">${titulo}</p>
            <button type="button" class="${botaoClass}" data-limpar-busca>${rotulo}</button>
        </div>
    `;
}
