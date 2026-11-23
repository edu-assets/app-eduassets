import type { AgendamentoAfetado } from '../../types/index.js';

/**
 * Agendamentos afetados informados na resposta de `POST /ocorrencias`: a API devolve uma LISTA de ocorrências
 * criadas e cada uma traz `agendamentosAfetados` (vazio em OBSERVACAO). Junta os de todas as ocorrências sem repetir
 * o mesmo agendamento. Também aceita um objeto único com o campo. Sem o campo (API antiga) devolve lista vazia.
 */
export function extrairAgendamentosAfetados(resposta: unknown): AgendamentoAfetado[] {
    const itens: unknown[] = Array.isArray(resposta) ? resposta : [resposta];
    const porId = new Map<number, AgendamentoAfetado>();
    itens.forEach((item) => {
        const lista = (item as { agendamentosAfetados?: unknown } | null | undefined)?.agendamentosAfetados;
        if (!Array.isArray(lista)) return;
        (lista as AgendamentoAfetado[]).forEach((agendamento) => {
            if (agendamento && !porId.has(agendamento.id)) porId.set(agendamento.id, agendamento);
        });
    });
    return [...porId.values()];
}
