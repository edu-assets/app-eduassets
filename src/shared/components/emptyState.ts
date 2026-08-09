import { html, raw } from '../../core/utils/html.js';

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
        return html`<span class="material-symbols-outlined ${iconClass}">${icon}</span>`;
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