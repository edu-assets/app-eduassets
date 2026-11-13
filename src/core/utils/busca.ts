export function normalizarBusca(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Client-side filter: every word in the query must appear (accent/case-insensitive). */
export function filtrarPorBusca<T>(itens: T[], termo: string, textoDe: (item: T) => string): T[] {
    const palavras = normalizarBusca(termo).split(/\s+/).filter(Boolean);
    if (!palavras.length) return itens;
    return itens.filter((item) => {
        const texto = normalizarBusca(textoDe(item));
        return palavras.every((p) => texto.includes(p));
    });
}
