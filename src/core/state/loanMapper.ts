import type { Emprestimo, LoanUI } from '../../types/index.js';
import { extrairAutoria } from '../utils/autoria.js';

/** Converte o empréstimo da API no formato usado pelas telas (e pela exportação). */
export function mapEmprestimo(loan: Emprestimo): LoanUI {
    return {
        id: loan.id,
        numero: loan.id,
        aluno: loan.solicitanteNome,
        responsavel: loan.responsavel?.nome ?? '',
        responsavelId: loan.responsavelId,
        status: loan.status === 'ABERTO' ? 'aberto' : 'devolvido',
        data: loan.dataRetirada,
        dataDevolucao: loan.dataDevolucao ?? null,
        observacao: loan.observacao ?? '',
        createdAt: new Date(loan.createdAt),
        ...extrairAutoria(loan),
        itens: (loan.itens ?? []).map((item) => ({
            id: item.equipamentoId,
            nome: item.equipamento?.modelo ?? '',
            quantidade: item.quantidade
        }))
    };
}
