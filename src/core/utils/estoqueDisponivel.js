export function calcularDisponivelEfetivo(equipamento, reservadoPeloRegistroAtual = 0) {
    return (equipamento?.quantidadeDisponivel ?? 0) + reservadoPeloRegistroAtual;
}