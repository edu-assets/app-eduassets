import type { LoanUI, NivelAcesso } from '../../types/index.js';

/** Prazo do EDITOR para excluir um empréstimo em andamento, contado a partir do que for mais recente: registro ou retirada. */
export const PRAZO_EXCLUSAO_EMPRESTIMO_MS = 24 * 60 * 60 * 1000;

/**
 * Espelho da regra do servidor: só um empréstimo ABERTO pode ser excluído; ADMINISTRADOR sempre, EDITOR até 24h depois
 * de `max(createdAt, dataRetirada)`. Sem sessão (convidado) nunca. O servidor continua sendo a palavra final.
 */
export function podeExcluirEmprestimo(
    loan: Pick<LoanUI, 'status' | 'createdAt' | 'data'>,
    nivelAcesso: NivelAcesso | null | undefined,
    agora: Date | number
): boolean {
    if (loan.status !== 'aberto') return false;
    if (nivelAcesso === 'ADMINISTRADOR') return true;
    if (nivelAcesso !== 'EDITOR') return false;

    const inicio = Math.max(new Date(loan.createdAt).getTime(), new Date(loan.data).getTime() || 0);
    if (Number.isNaN(inicio)) return false;
    return new Date(agora).getTime() - inicio <= PRAZO_EXCLUSAO_EMPRESTIMO_MS;
}
