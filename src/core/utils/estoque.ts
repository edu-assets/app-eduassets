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

/* ===== Disponibilidade por janela (espelho do cálculo do servidor) ===== */

/** Um empréstimo com mais que isto de antecedência na data de retirada é um agendamento. */
export const ANTECEDENCIA_AGENDAMENTO_MS = 5 * 60_000;
/** Maior antecedência permitida para o início de um agendamento (15 dias). */
export const HORIZONTE_AGENDAMENTO_MS = 15 * 24 * 3_600_000;
/** Duração máxima da janela de um agendamento (15 dias): além disso a API recusa a devolução prevista. */
export const DURACAO_MAXIMA_AGENDAMENTO_MS = 15 * 24 * 3_600_000;

/** Retirada com mais de 5 minutos de antecedência = agendamento. */
export function ehAgendamento(inicio: Date, agora: Date): boolean {
    return inicio.getTime() > agora.getTime() + ANTECEDENCIA_AGENDAMENTO_MS;
}

/** Menor início aceito para um agendamento: o primeiro minuto cheio depois de agora + 5 min. */
export function inicioMinimoAgendamento(agora: Date): Date {
    const minimo = new Date(agora.getTime() + ANTECEDENCIA_AGENDAMENTO_MS);
    minimo.setSeconds(0, 0);
    minimo.setMinutes(minimo.getMinutes() + 1);
    return minimo;
}

/** Maior início aceito para um agendamento: agora + 15 dias. */
export function inicioMaximoAgendamento(agora: Date): Date {
    return new Date(agora.getTime() + HORIZONTE_AGENDAMENTO_MS);
}

export interface EquipamentoCapacidadeMinimo {
    id: string | number;
    quantidadeTotal?: number;
    quantidadeQuebrada?: number;
}

export interface LoanOcupacaoMinimo {
    id: number;
    status: 'aberto' | 'devolvido' | 'agendado';
    /** Retirada (agendada enquanto AGENDADO; real depois de confirmada). */
    data: string;
    dataAgendada?: string | null;
    dataPrevistaDevolucao?: string | null;
    itens: LoanItemMinimo[];
}

export interface ContextoDisponibilidade {
    /** Empréstimos ativos (abertos e agendados); os devolvidos são ignorados. */
    loans: LoanOcupacaoMinimo[];
    /** Ocorrências de manutenção; só as ABERTAS (status 'aberto') reduzem a capacidade. */
    ocorrenciasManutencao: Array<OcorrenciaManutencaoMinima & { status?: string }>;
    agora: Date;
}

export interface ItemDisponibilidade {
    equipamento: EquipamentoCapacidadeMinimo;
    quantidade: number;
}

type Instante = Date | number;

function ms(valor: Instante): number {
    return valor instanceof Date ? valor.getTime() : valor;
}

function instanteIso(valor: string | null | undefined): number | null {
    if (!valor) return null;
    const tempo = new Date(valor).getTime();
    return Number.isNaN(tempo) ? null : tempo;
}

/** Unidades que podem estar fora da prateleira ao mesmo tempo: total − quebradas − manutenções abertas (nunca < 0). */
export function capacidadeEquipamento(
    equipamento: EquipamentoCapacidadeMinimo | null | undefined,
    ocorrenciasManutencao: Array<OcorrenciaManutencaoMinima & { status?: string }> = []
): number {
    if (!equipamento) return 0;
    const emManutencao = ocorrenciasManutencao.filter((o) =>
        String(o.equipamentoId) === String(equipamento.id) && (o.status === undefined || o.status === 'aberto')).length;
    const total = Number(equipamento.quantidadeTotal) || 0;
    const quebradas = Number(equipamento.quantidadeQuebrada) || 0;
    return Math.max(0, total - quebradas - emManutencao);
}

export interface IntervaloOcupado {
    loanId: number;
    inicio: number;
    /** Infinity = sem previsão de devolução. */
    fim: number;
    quantidade: number;
}

/**
 * Janelas em que `equipamentoId` está comprometido:
 * - ABERTO: [retirada, devolução prevista) se a previsão ainda está no futuro; vencido ou sem previsão ocupa até ser devolvido (+∞);
 * - AGENDADO: [início agendado, devolução prevista).
 */
export function intervalosOcupados(
    equipamentoId: string | number,
    loans: LoanOcupacaoMinimo[],
    agora: Instante,
    excluirLoanId?: number
): IntervaloOcupado[] {
    const agoraMs = ms(agora);
    const resultado: IntervaloOcupado[] = [];
    loans.forEach((loan) => {
        if (loan.id === excluirLoanId || loan.status === 'devolvido') return;
        const quantidade = loan.itens
            .filter((item) => String(item.id) === String(equipamentoId))
            .reduce((soma, item) => soma + (Number(item.quantidade) || 0), 0);
        if (quantidade <= 0) return;
        const prevista = instanteIso(loan.dataPrevistaDevolucao);
        if (loan.status === 'agendado') {
            const inicio = instanteIso(loan.dataAgendada) ?? instanteIso(loan.data);
            if (inicio === null) return;
            resultado.push({ loanId: loan.id, inicio, fim: prevista ?? Infinity, quantidade });
        } else {
            const inicio = instanteIso(loan.data);
            if (inicio === null) return;
            resultado.push({ loanId: loan.id, inicio, fim: prevista !== null && prevista > agoraMs ? prevista : Infinity, quantidade });
        }
    });
    return resultado;
}

/** Maior soma de quantidades simultâneas dentro de [inicio, fim) (intervalos semiabertos: encostar não conflita). */
export function picoOcupacao(intervalos: IntervaloOcupado[], inicio: number, fim: number): number {
    const eventos: Array<[number, number]> = [];
    intervalos.forEach((i) => {
        if (!(i.inicio < fim && i.fim > inicio)) return;
        eventos.push([Math.max(i.inicio, inicio), i.quantidade]);
        eventos.push([Math.min(i.fim, fim), -i.quantidade]);
    });
    // No mesmo instante as saídas vêm antes das entradas.
    eventos.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let atual = 0;
    let pico = 0;
    eventos.forEach(([, delta]) => {
        atual += delta;
        if (atual > pico) pico = atual;
    });
    return pico;
}

/**
 * Unidades livres durante TODA a janela [inicio, fim): capacidade − pico de ocupação (nunca < 0).
 * `excluirLoanId` ignora um empréstimo (ex.: o próprio agendamento ao reavaliá-lo).
 */
export function livreNoIntervalo(
    equipamento: EquipamentoCapacidadeMinimo,
    inicio: Instante,
    fim: Instante,
    contexto: ContextoDisponibilidade,
    excluirLoanId?: number
): number {
    const inicioMs = ms(inicio);
    const fimMs = Math.max(ms(fim), inicioMs + 1);
    const capacidade = capacidadeEquipamento(equipamento, contexto.ocorrenciasManutencao);
    const intervalos = intervalosOcupados(equipamento.id, contexto.loans, contexto.agora, excluirLoanId);
    return Math.max(0, capacidade - picoOcupacao(intervalos, inicioMs, fimMs));
}

export interface OpcoesProximoHorario {
    /** Primeiro instante considerado (padrão: agora). */
    desde?: Date;
    excluirLoanId?: number;
}

/**
 * Primeiro instante (agora/`desde` ou o fim de alguma janela ocupada, até agora + 15 dias) em que TODOS os itens
 * têm unidades livres durante `duracaoMs`. null se nunca (acima da capacidade ou fora do horizonte).
 */
export function proximoHorarioLivre(
    itens: ItemDisponibilidade[],
    duracaoMs: number,
    contexto: ContextoDisponibilidade,
    opcoes: OpcoesProximoHorario = {}
): Date | null {
    const duracao = Math.max(1, duracaoMs);
    const desde = ms(opcoes.desde ?? contexto.agora);
    const limite = contexto.agora.getTime() + HORIZONTE_AGENDAMENTO_MS;
    if (!itens.length) return new Date(desde);

    const candidatos = new Set<number>([desde]);
    itens.forEach(({ equipamento }) => {
        intervalosOcupados(equipamento.id, contexto.loans, contexto.agora, opcoes.excluirLoanId).forEach((i) => {
            if (Number.isFinite(i.fim) && i.fim > desde && i.fim <= limite) candidatos.add(i.fim);
        });
    });

    const ordenados = [...candidatos].sort((a, b) => a - b);
    const achado = ordenados.find((inicio) => itens.every(({ equipamento, quantidade }) =>
        livreNoIntervalo(equipamento, inicio, inicio + duracao, contexto, opcoes.excluirLoanId) >= quantidade));
    return achado === undefined ? null : new Date(achado);
}
