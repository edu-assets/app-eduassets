const TAGS_PERMITIDAS = new Set([
    'h1', 'h2', 'h3', 'h4',
    'p', 'br', 'hr',
    'strong', 'em', 'b', 'i', 'code', 'pre',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote',
    'a', 'img',
    'span', 'div',
    'button'
]);

const ATRIBUTOS_PERMITIDOS: Record<string, string[]> = {
    a: ['href', 'title', 'id'],
    img: ['src', 'alt', 'title', 'loading', 'width', 'height'],
    div: ['class', 'id', 'data-callout', 'data-doc-id'],
    span: ['class'],
    button: ['class', 'type', 'data-copy-target', 'aria-label'],
    code: ['class'],
    pre: ['class'],
    table: ['class'],
    h1: ['id'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id'],
    p: ['class']
};

const PROTOCOLOS_PERMITIDOS_HREF = ['http:', 'https:', 'mailto:', '#'];

function hrefEhSeguro(valor: string): boolean {
    const trimmed = valor.trim();
    if (trimmed.startsWith('#')) return true;
    try {
        if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return true;
        const url = new URL(trimmed, window.location.origin);
        return PROTOCOLOS_PERMITIDOS_HREF.includes(url.protocol);
    } catch {
        return false;
    }
}

export function sanitizeHtml(htmlBruto: string): string {
    const template = document.createElement('template');
    template.innerHTML = htmlBruto;

    limparNo(template.content);

    return template.innerHTML;
}

function limparNo(raiz: DocumentFragment | Element): void {
    const elementos = Array.from(raiz.querySelectorAll('*'));

    for (const el of elementos) {
        const tag = el.tagName.toLowerCase();

        if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' || tag === 'embed') {
            el.remove();
            continue;
        }

        if (!TAGS_PERMITIDAS.has(tag)) {
            const pai = el.parentNode;
            if (pai) {
                while (el.firstChild) pai.insertBefore(el.firstChild, el);
                pai.removeChild(el);
            }
            continue;
        }

        const permitidos = new Set(ATRIBUTOS_PERMITIDOS[tag] ?? []);
        for (const attr of Array.from(el.attributes)) {
            const nome = attr.name.toLowerCase();

            if (nome.startsWith('on')) {
                el.removeAttribute(attr.name);
                continue;
            }

            if (!permitidos.has(nome)) {
                el.removeAttribute(attr.name);
                continue;
            }

            if (nome === 'href' && !hrefEhSeguro(attr.value)) {
                el.removeAttribute(attr.name);
            }

            if (nome === 'src' && el.tagName.toLowerCase() === 'img') {
                const valor = attr.value.trim();
                const local = valor.startsWith('/') || valor.startsWith('./') || valor.startsWith('../');
                const remoto = valor.startsWith('https://');
                if (!local && !remoto) el.removeAttribute(attr.name);
            }
        }

        if (tag === 'a') {
            el.removeAttribute('target');
            el.setAttribute('rel', 'noopener noreferrer');
        }

        if (tag === 'img') {
            el.setAttribute('loading', 'lazy');
        }
    }
}