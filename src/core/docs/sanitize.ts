import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
    'h1', 'h2', 'h3', 'h4',
    'p', 'br', 'hr',
    'strong', 'em', 'b', 'i', 'code', 'pre',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'a', 'img', 'span', 'div', 'button'
];

const ATTRIBUTES_BY_TAG: Record<string, ReadonlySet<string>> = {
    a: new Set(['href', 'title']),
    img: new Set(['src', 'alt', 'title', 'loading', 'width', 'height']),
    div: new Set(['class', 'data-callout', 'data-doc-id']),
    span: new Set(['class']),
    button: new Set(['class', 'type', 'data-copy-target', 'aria-label']),
    code: new Set(['class']),
    pre: new Set(['class']),
    table: new Set(['class']),
    p: new Set(['class'])
};

const URL_CONTROL_OR_SPACE = /[\u0000-\u0020\u007f-\u009f]/g;
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

function normalizeUrl(value: string): string {
    return value.replace(URL_CONTROL_OR_SPACE, '');
}

function currentBaseUrl(): URL {
    return new URL(typeof window === 'undefined' ? 'https://eduassets.tech/' : window.location.href);
}

function isSafeHref(rawValue: string): boolean {
    const value = normalizeUrl(rawValue.trim());
    if (!value) return false;
    if (value.startsWith('#')) return true;
    if (value.startsWith('//') || value.startsWith('\\\\')) return false;

    const scheme = value.match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
    if (scheme) return ALLOWED_SCHEMES.has(`${scheme.toLowerCase()}:`);

    try {
        const base = currentBaseUrl();
        const resolved = new URL(value, base);
        return (resolved.protocol === 'http:' || resolved.protocol === 'https:')
            && resolved.origin === base.origin;
    } catch {
        return false;
    }
}

function isSameOriginImage(rawValue: string): boolean {
    const value = normalizeUrl(rawValue.trim());
    if (!value || value.startsWith('//') || value.startsWith('\\\\')) return false;

    const scheme = value.match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
    if (scheme && scheme.toLowerCase() !== 'http' && scheme.toLowerCase() !== 'https') return false;

    try {
        const base = currentBaseUrl();
        const resolved = new URL(value, base);
        return (resolved.protocol === 'http:' || resolved.protocol === 'https:')
            && resolved.origin === base.origin;
    } catch {
        return false;
    }
}

DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    const tag = node.nodeName.toLowerCase();
    const attribute = data.attrName.toLowerCase();
    if (!ATTRIBUTES_BY_TAG[tag]?.has(attribute)) {
        data.keepAttr = false;
        return;
    }

    if (tag === 'a' && attribute === 'href' && !isSafeHref(data.attrValue)) {
        data.keepAttr = false;
    }
    if (tag === 'img' && attribute === 'src' && !isSameOriginImage(data.attrValue)) {
        data.keepAttr = false;
    }
});

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeType !== 1) return;
    const element = node as Element;
    if (element.tagName.toLowerCase() === 'a') {
        element.setAttribute('rel', 'noopener noreferrer');
    }
    if (element.tagName.toLowerCase() === 'img') {
        element.setAttribute('loading', 'lazy');
    }
});

export function sanitizeHtml(htmlBruto: string): string {
    return DOMPurify.sanitize(htmlBruto, {
        ALLOWED_TAGS,
        ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'loading', 'width', 'height', 'class', 'type'],
        ADD_ATTR: ['data-callout', 'data-doc-id', 'data-copy-target', 'aria-label'],
        ALLOW_DATA_ATTR: false,
        ALLOW_ARIA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math'],
        FORBID_ATTR: ['id', 'name', 'style', 'target'],
        KEEP_CONTENT: true,
        RETURN_TRUSTED_TYPE: false
    }) as string;
}
