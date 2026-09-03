export interface EquipamentoComDisponivel {
    quantidadeDisponivel?: number;
}

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

export function calcularDisponivelEfetivo(
    equipamento: EquipamentoComDisponivel | null | undefined,
    reservadoPeloRegistroAtual: number = 0
): number {
    return (equipamento?.quantidadeDisponivel ?? 0) + reservadoPeloRegistroAtual;
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