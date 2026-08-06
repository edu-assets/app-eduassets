import { returnLoan, updateLoan } from '../../core/state/loans.js';
import { adicionarOuIncrementarItem, removerItemPorId, atualizarQuantidadeItem } from '../../core/utils/listaItens.js';
import type { LoanItemUI } from '../../types/index.js';

export { adicionarOuIncrementarItem, removerItemPorId, atualizarQuantidadeItem };

export async function confirmarDevolucao(id: number): Promise<void> {
    await returnLoan(id);
}

export async function salvarItensEmprestimo(id: number, itens: LoanItemUI[]): Promise<void> {
    if (!itens.length) {
        throw new Error('O empréstimo precisa ter ao menos um equipamento');
    }
    await updateLoan(id, { itens });
}