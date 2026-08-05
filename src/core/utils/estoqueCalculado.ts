export function contarEmprestadoPorEquipamento(loansAbertos) {
    const mapa = new Map();
    loansAbertos.forEach((loan) => {
        loan.itens.forEach((item) => {
            const id = String(item.id);
            mapa.set(id, (mapa.get(id) ?? 0) + item.quantidade);
        });
    });
    return mapa;
}

/** 1 ocorrência = 1 unidade). */
export function contarManutencaoPorEquipamento(ocorrenciasManutencao) {
    const mapa = new Map();
    ocorrenciasManutencao.forEach((ocorrencia) => {
        const id = String(ocorrencia.equipamentoId);
        mapa.set(id, (mapa.get(id) ?? 0) + 1);
    });
    return mapa;
}