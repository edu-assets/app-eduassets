export function adicionarOuIncrementarItem(itens, novoItem) {
    const existente = itens.find((item) => item.id === novoItem.id);

    if (existente) {
        return itens.map((item) => item.id === novoItem.id
            ? { ...item, quantidade: item.quantidade + novoItem.quantidade }
            : item);
    }

    return [...itens, novoItem];
}

export function removerItemPorId(itens, id) {
    return itens.filter((item) => item.id !== id);
}

export function atualizarQuantidadeItem(itens, id, quantidade) {
    const quantidadeValida = Math.max(1, Number(quantidade) || 1);
    return itens.map((item) => item.id === id ? { ...item, quantidade: quantidadeValida } : item);
}