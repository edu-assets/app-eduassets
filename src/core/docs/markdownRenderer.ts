import { sanitizeHtml } from './sanitize.js';
import { getIdioma } from '../state/i18nStore.js';

export interface HeadingItem {
    id: string;
    nivel: 2 | 3;
    texto: string;
}

export interface DocumentoRenderizado {
    html: string;
    headings: HeadingItem[];
}

type MarkedModulo = typeof import('marked');

let modulePromise: Promise<MarkedModulo> | null = null;

function carregarMarked(): Promise<MarkedModulo> {
    if (!modulePromise) {
        modulePromise = import('marked');
    }
    return modulePromise;
}

const CALLOUT_TIPOS_POR_IDIOMA = {
    pt: { NOTE: 'Nota', TIP: 'Dica', WARNING: 'Atenção', IMPORTANT: 'Importante' },
    en: { NOTE: 'Note', TIP: 'Tip', WARNING: 'Warning', IMPORTANT: 'Important' }
} as const;

const CALLOUT_TIPOS = {
    NOTE: { classe: 'note', icone: 'info' },
    TIP: { classe: 'tip', icone: 'lightbulb' },
    WARNING: { classe: 'warning', icone: 'warning' },
    IMPORTANT: { classe: 'important', icone: 'report' }
} as const;

const CALLOUT_REGEX = /<blockquote>\s*<p>\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*<br\s*\/?>([\s\S]*?)<\/p>\s*<\/blockquote>/g;

function transformarCallouts(html: string): string {
    const idioma = getIdioma() as keyof typeof CALLOUT_TIPOS_POR_IDIOMA;

    return html.replace(CALLOUT_REGEX, (_match, tipo: string, conteudo: string) => {
        const tipoChave = tipo as keyof typeof CALLOUT_TIPOS;

        const info = CALLOUT_TIPOS[tipoChave];
        const titulo = CALLOUT_TIPOS_POR_IDIOMA[idioma][tipoChave];

        return `
            <div class="doc-callout ${info.classe}" data-callout="${tipo.toLowerCase()}">
                <span class="material-symbols-outlined doc-callout-icon">${info.icone}</span>
                <div class="doc-callout-body">
                    <strong class="doc-callout-title">${titulo}</strong>
                    <p>${conteudo.trim()}</p>
                </div>
            </div>
        `;
    });
}

function slugify(texto: string): string {
    return texto
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

function extrairHeadingsEInjetarIds(html: string): { html: string; headings: HeadingItem[] } {
    const template = document.createElement('template');
    template.innerHTML = html;

    const headings: HeadingItem[] = [];
    const usados = new Map<string, number>();

    template.content.querySelectorAll('h2, h3').forEach((el) => {
        const texto = (el.textContent || '').trim();
        let id = slugify(texto) || 'secao';

        const contagem = usados.get(id) ?? 0;
        usados.set(id, contagem + 1);
        if (contagem > 0) id = `${id}-${contagem}`;

        el.id = id;
        headings.push({
            id,
            nivel: el.tagName.toLowerCase() === 'h2' ? 2 : 3,
            texto
        });
    });

    template.content.querySelectorAll('pre > code').forEach((codeEl) => {
        const pre = codeEl.parentElement;
        if (!pre) return;
        pre.classList.add('doc-code');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'doc-code-copy-btn';
        btn.setAttribute('aria-label', 'Copiar código');
        btn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
        pre.prepend(btn);
    });

    template.content.querySelectorAll('table').forEach((table) => {
        table.classList.add('doc-table');
        const wrapper = document.createElement('div');
        wrapper.className = 'doc-table-wrap';
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });

    template.content.querySelectorAll('img').forEach((img) => {
        img.classList.add('doc-image');
    });

    return { html: template.innerHTML, headings };
}

export async function renderizarMarkdown(markdown: string): Promise<DocumentoRenderizado> {
    const { marked } = await carregarMarked();

    marked.setOptions({ gfm: true, breaks: false });

    const htmlBruto = await marked.parse(markdown);
    const comCallouts = transformarCallouts(htmlBruto);
    const sanitizado = sanitizeHtml(comCallouts);
    const { html, headings } = extrairHeadingsEInjetarIds(sanitizado);

    return { html, headings };
}