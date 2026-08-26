import type { HeadingItem } from './markdownRenderer.js';

export function renderTocHtml(headings: HeadingItem[]): string {
    if (!headings.length) return '';

    return headings.map((h) => `
        <a href="#${h.id}" class="doc-toc-item doc-toc-item-${h.nivel}" data-toc-target="${h.id}">
            ${h.texto}
        </a>
    `).join('');
}

export function iniciarScrollSpy(
    conteudoEl: HTMLElement,
    tocEl: HTMLElement,
    headings: HeadingItem[]
): () => void {
    if (!headings.length) return () => { };
    const root = conteudoEl.closest<HTMLElement>('.doc-content') ?? conteudoEl;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const id = entry.target.id;

                tocEl.querySelectorAll('.doc-toc-item').forEach((item) => {
                    item.classList.toggle('active', item.getAttribute('data-toc-target') === id);
                });
            });
        },
        { root, rootMargin: '0px 0px -70% 0px', threshold: 0 }
    );

    headings.forEach((h) => {
        const el = conteudoEl.querySelector(`#${CSS.escape(h.id)}`);
        if (el) observer.observe(el);
    });

    return () => observer.disconnect();
}

export function scrollParaSecao(conteudoEl: HTMLElement, id: string): void {
    const alvo = conteudoEl.querySelector(`#${CSS.escape(id)}`);
    if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
}