export interface EquipamentoComDisponivel {
    quantidadeDisponivel?: number;
}

export function calcularDisponivelEfetivo(
    equipamento: EquipamentoComDisponivel | null | undefined,
    reservadoPeloRegistroAtual: number = 0
): number {
    return (equipamento?.quantidadeDisponivel ?? 0) + reservadoPeloRegistroAtual;
}