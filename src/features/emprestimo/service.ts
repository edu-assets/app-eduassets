import { addLoan } from '../../core/state/loans.js';
import type { LoanDraft } from '../../types/index.js';

export async function registrarEmprestimo(dados: LoanDraft): Promise<void> {
    if (!dados.itens.length) {
        throw new Error('Adicione ao menos um equipamento ao empréstimo');
    }

    await addLoan(dados);
}