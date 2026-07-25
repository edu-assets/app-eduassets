export function adicionarOuIncrementarItem(itens, novoItem) {
    const existente = itens.find((item) => String(item.id) === String(novoItem.id));

    if (existente) {
        return itens.map((item) => String(item.id) === String(novoItem.id)
            ? { ...item, quantidade: item.quantidade + novoItem.quantidade }
            : item);
    }

    return [...itens, novoItem];
}

export function removerItemPorId(itens, id) {
    return itens.filter((item) => String(item.id) !== String(id));
}

export function atualizarQuantidadeItem(itens, id, quantidade) {
    const quantidadeValida = Math.max(1, Number(quantidade) || 1);
    return itens.map((item) => String(item.id) === String(id) ? { ...item, quantidade: quantidadeValida } : item);
}