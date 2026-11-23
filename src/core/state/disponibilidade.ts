import { getLoansAtivos } from './loanStore.js';
import { getOcorrenciasPorTipo } from './ocorrenciasStore.js';
import { agora } from '../time/serverClock.js';
import {
    capacidadeEquipamento as capacidadePura,
    livreNoIntervalo as livrePuro,
    proximoHorarioLivre as proximoPuro,
    type ContextoDisponibilidade,
    type EquipamentoCapacidadeMinimo,
    type ItemDisponibilidade,
    type OpcoesProximoHorario
} from '../utils/estoque.js';

/**
 * Disponibilidade por janela calculada com os dados que o app já mantém (empréstimos ativos + ocorrências de
 * manutenção + relógio do servidor). A lógica pura (e testada) está em `core/utils/estoque.ts`.
 */

export function contextoDisponibilidade(): ContextoDisponibilidade {
    return {
        loans: getLoansAtivos(),
        ocorrenciasManutencao: getOcorrenciasPorTipo('manutencao'),
        agora: agora()
    };
}

/** total − quebradas − manutenções abertas. */
export function capacidade(equipamento: EquipamentoCapacidadeMinimo | null | undefined): number {
    return capacidadePura(equipamento, getOcorrenciasPorTipo('manutencao'));
}

/** Unidades livres durante toda a janela [inicio, fim). `excluirLoanId` ignora um empréstimo. */
export function livreNoIntervalo(
    equipamento: EquipamentoCapacidadeMinimo,
    inicio: Date | number,
    fim: Date | number,
    excluirLoanId?: number
): number {
    return livrePuro(equipamento, inicio, fim, contextoDisponibilidade(), excluirLoanId);
}

/** Primeiro horário (até agora + 15 dias) em que todos os itens ficam livres por `duracaoMs`; null se não houver. */
export function proximoHorarioLivre(itens: ItemDisponibilidade[], duracaoMs: number, opcoes?: OpcoesProximoHorario): Date | null {
    return proximoPuro(itens, duracaoMs, contextoDisponibilidade(), opcoes);
}
