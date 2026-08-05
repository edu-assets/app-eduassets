import { addLoan } from '../../core/state/loans.js';

export async function registrarEmprestimo(dados) {
    if (!dados.itens.length) {
        throw new Error('Adicione ao menos um equipamento ao empréstimo');
    }

    await addLoan(dados);
}