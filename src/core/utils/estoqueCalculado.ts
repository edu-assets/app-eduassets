export interface LoanItemMinimo {
    id: string | number;
    quantidade: number;
}

export interface LoanAbertoMinimo {
    itens: LoanItemMinimo[];
}

export interface OcorrenciaManutencaoMinima {
    equipamentoId: string | number;
}

export function contarEmprestadoPorEquipamento(loansAbertos: LoanAbertoMinimo[]): Map<string, number> {
    const mapa = new Map<string, number>();
    loansAbertos.forEach((loan) => {
        loan.itens.forEach((item) => {
            const id = String(item.id);
            mapa.set(id, (mapa.get(id) ?? 0) + item.quantidade);
        });
    });
    return mapa;
}

export function contarManutencaoPorEquipamento(ocorrenciasManutencao: OcorrenciaManutencaoMinima[]): Map<string, number> {
    const mapa = new Map<string, number>();
    ocorrenciasManutencao.forEach((ocorrencia) => {
        const id = String(ocorrencia.equipamentoId);
        mapa.set(id, (mapa.get(id) ?? 0) + 1);
    });
    return mapa;
}