/**
 * Relógio do servidor. A API devolve `serverTime` em cada resposta de /sync/estado; o app guarda o
 * deslocamento (servidor − aparelho) para que campos de data automáticos não dependam do relógio do aparelho.
 */

interface Amostra {
    /** serverTime − ponto médio da requisição (ms). */
    offset: number;
    /** Tempo de ida e volta da requisição (ms). */
    rtt: number;
}

const MAX_AMOSTRAS = 5;

let amostras: Amostra[] = [];

/**
 * Registra uma medição. `t0`/`t1` são `Date.now()` imediatamente antes e depois da requisição;
 * a hora do servidor é assumida no ponto médio. Amostras inválidas são ignoradas.
 */
export function registrarAmostra(serverTime: string | number | Date, t0: number, t1: number): void {
    const servidor = serverTime instanceof Date ? serverTime.getTime() : new Date(serverTime).getTime();
    if (!Number.isFinite(servidor) || !Number.isFinite(t0) || !Number.isFinite(t1)) return;
    const rtt = t1 - t0;
    if (rtt < 0) return;
    amostras.push({ offset: servidor - (t0 + t1) / 2, rtt });
    if (amostras.length > MAX_AMOSTRAS) amostras = amostras.slice(-MAX_AMOSTRAS);
}

/** Deslocamento (ms) da amostra de menor RTT entre as últimas; 0 sem amostras. */
export function deslocamentoMs(): number {
    if (!amostras.length) return 0;
    return amostras.reduce((melhor, amostra) => (amostra.rtt < melhor.rtt ? amostra : melhor)).offset;
}

/** "Agora" segundo o servidor; sem amostras, o relógio do aparelho. */
export function agora(): Date {
    return new Date(Date.now() + deslocamentoMs());
}

export function reiniciarRelogio(): void {
    amostras = [];
}
