/**
 * Icones Material Symbols sao ligaturas: o leitor de tela le o nome do icone
 * ("check", "close"...) como texto. Icones decorativos sao escondidos com
 * aria-hidden; os que ja tem nome acessivel (aria-label, aria-labelledby,
 * aria-hidden, role="img") sao preservados.
 */
export const SELETOR_ICONE = '.material-symbols-outlined';

function ehIconeDecorativo(elemento: Element): boolean {
    return elemento.matches(SELETOR_ICONE)
        && !elemento.hasAttribute('aria-hidden')
        && !elemento.hasAttribute('aria-label')
        && !elemento.hasAttribute('aria-labelledby')
        && elemento.getAttribute('role') !== 'img';
}

/** Marca como aria-hidden todos os icones decorativos dentro de `raiz` (incluindo a propria raiz). Retorna quantos foram marcados. */
export function ocultarIconesDecorativos(raiz: ParentNode | Element = document): number {
    const candidatos: Element[] = [];
    if (raiz instanceof Element) candidatos.push(raiz);
    candidatos.push(...Array.from(raiz.querySelectorAll(SELETOR_ICONE)));

    let marcados = 0;
    candidatos.forEach((elemento) => {
        if (!ehIconeDecorativo(elemento)) return;
        elemento.setAttribute('aria-hidden', 'true');
        marcados++;
    });
    return marcados;
}

let observador: MutationObserver | null = null;

/** Marca os icones existentes e os que forem adicionados ao DOM depois (uma unica vez). */
export function initIconesDecorativos(): void {
    if (observador || typeof document === 'undefined' || !document.body) return;
    ocultarIconesDecorativos(document.body);
    observador = new MutationObserver((mutacoes) => {
        mutacoes.forEach((mutacao) => {
            mutacao.addedNodes.forEach((no) => {
                if (no instanceof Element) ocultarIconesDecorativos(no);
            });
        });
    });
    observador.observe(document.body, { childList: true, subtree: true });
}
