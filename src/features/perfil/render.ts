els.estoqueContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest<HTMLElement>('.estoque-row');
    if (!row) return;

    const equipamento = buscarEquipamentoPorId(row.dataset.equipamentoId ?? '', getEquipamentos());
    if (!equipamento) return;

    exibirDetalheEstoque(els, estado, equipamento, ehLayoutEmpilhado(LAYOUT_EMPILHADO_BREAKPOINT));
});