/**
 * Ordena as respostas de leitura de um store: a sincronização ao vivo e a recarga após uma operação podem buscar a
 * mesma lista ao mesmo tempo, e as respostas podem chegar fora de ordem. Uma resposta só é aplicada se nenhuma
 * leitura iniciada depois dela já tiver sido aplicada — assim um snapshot antigo nunca sobrescreve um mais novo.
 */
export function criarLeituraOrdenada() {
    let ultimaIniciada = 0;
    let ultimaAplicada = 0;

    return {
        iniciar: (): number => ++ultimaIniciada,
        /** Retorna true (e registra) se a leitura `id` ainda pode ser aplicada. */
        podeAplicar: (id: number): boolean => {
            if (id < ultimaAplicada) return false;
            ultimaAplicada = id;
            return true;
        }
    };
}

/** Evita notificar assinantes (e re-renderizar telas) quando a lista recarregada é idêntica à atual. */
export function mesmoConteudo(a: unknown, b: unknown): boolean {
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch {
        return false;
    }
}
