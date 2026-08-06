import { escapeHtml } from '../../core/utils/sanitize.js';

type TagOuNulo = string | null;

function renderTexto(texto: string | undefined, tag: TagOuNulo, classe: string | undefined): string {
    if (!texto) return '';
    if (!tag) return escapeHtml(texto);
    return `<${tag} class="${escapeHtml(classe || '')}">${escapeHtml(texto)}</${tag}>`;
}

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
    const midia = imageSrc
        ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(imageAlt)}" class="${escapeHtml(imageClass)}">`
        : icon
            ? `<span class="material-symbols-outlined ${escapeHtml(iconClass)}">${escapeHtml(icon)}</span>`
            : '';

    return `
        <div class="${escapeHtml(containerClass)}">
            ${midia}
            ${renderTexto(titulo, tituloTag, tituloClass)}
            ${renderTexto(subtitulo, subtituloTag, subtituloClass)}
        </div>
    `;
}