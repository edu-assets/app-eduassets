import { escapeHtml } from '../../core/utils/sanitize.js';

function renderTexto(texto, tag, classe) {
    if (!texto) return '';
    if (!tag) return escapeHtml(texto);
    return `<${tag} class="${escapeHtml(classe || '')}">${escapeHtml(texto)}</${tag}>`;
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
}) {
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