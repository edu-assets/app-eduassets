import { getLoansAbertos, getHistorico, subscribe as subscribeAbertos, subscribeHistorico } from '../../core/state/loanStore.js';
import { isAutenticado } from '../../core/state/authStore.js';
import { aoTrocarSessao } from '../../core/state/sessionChange.js';
import type { LoanUI } from '../../types/index.js';

export const ID_DATALIST_SOLICITANTES = 'solicitantes-sugestoes';
export const LIMITE_SOLICITANTES = 200;

function tempoRegistro(loan: LoanUI): number {
    const tempo = loan.createdAt instanceof Date ? loan.createdAt.getTime() : NaN;
    return Number.isFinite(tempo) ? tempo : -Infinity;
}

/**
 * Nomes de solicitantes distintos (sem espaços nas pontas, sem diferenciar maiúsculas), na grafia do registro mais
 * recente, em ordem alfabética (locale atual), limitados a `limite`.
 */
export function coletarSolicitantes(loans: Iterable<LoanUI>, limite = LIMITE_SOLICITANTES): string[] {
    const porChave = new Map<string, { nome: string; tempo: number }>();
    for (const loan of loans) {
        const nome = (loan.aluno ?? '').trim();
        if (!nome) continue;
        const chave = nome.toLocaleLowerCase();
        const tempo = tempoRegistro(loan);
        const atual = porChave.get(chave);
        if (!atual || tempo > atual.tempo) porChave.set(chave, { nome, tempo });
    }
    return [...porChave.values()]
        .map((entrada) => entrada.nome)
        .sort((a, b) => a.localeCompare(b))
        .slice(0, Math.max(0, limite));
}

/** Preenche o datalist. Convidados (dados mascarados) nunca recebem sugestões. */
export function atualizarSugestoesSolicitante(datalist: HTMLDataListElement): void {
    const nomes = isAutenticado()
        ? coletarSolicitantes([...getLoansAbertos(), ...getHistorico().items])
        : [];
    datalist.replaceChildren(...nomes.map((nome) => {
        const option = document.createElement('option');
        option.value = nome;
        return option;
    }));
}

/**
 * Liga o datalist aos stores de empréstimos e à troca de sessão. Ao trocar de sessão o datalist é esvaziado na hora
 * (dados do dono anterior não podem sobrar); os stores repopulam quando carregarem os dados da nova sessão.
 */
export function iniciarSugestoesSolicitante(
    datalist: HTMLDataListElement | null = document.getElementById(ID_DATALIST_SOLICITANTES) as HTMLDataListElement | null
): () => void {
    if (!datalist) return () => undefined;
    const alvo = datalist;
    atualizarSugestoesSolicitante(alvo);
    const cancelamentos = [
        subscribeAbertos(() => atualizarSugestoesSolicitante(alvo)),
        subscribeHistorico(() => atualizarSugestoesSolicitante(alvo)),
        aoTrocarSessao(() => alvo.replaceChildren())
    ];
    return () => cancelamentos.forEach((cancelar) => cancelar());
}
