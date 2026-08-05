export interface ItemComQuantidade {
    id: string | number;
    quantidade: number;
    [key: string]: unknown;
}

export function adicionarOuIncrementarItem<T extends ItemComQuantidade>(itens: T[], novoItem: T): T[] {
    const existente = itens.find((item) => String(item.id) === String(novoItem.id));

    if (existente) {
        return itens.map((item) => String(item.id) === String(novoItem.id)
            ? { ...item, quantidade: item.quantidade + novoItem.quantidade }
            : item);
    }

    return [...itens, novoItem];
}

export function removerItemPorId<T extends ItemComQuantidade>(itens: T[], id: string | number): T[] {
    return itens.filter((item) => String(item.id) !== String(id));
}

export function atualizarQuantidadeItem<T extends ItemComQuantidade>(
    itens: T[],
    id: string | number,
    quantidade: number
): T[] {
    const quantidadeValida = Math.max(1, Number(quantidade) || 1);
    return itens.map((item) => String(item.id) === String(id) ? { ...item, quantidade: quantidadeValida } : item);
}