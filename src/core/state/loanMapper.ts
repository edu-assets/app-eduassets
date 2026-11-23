import type { Emprestimo, LoanUI, StatusLoanUI } from '../../types/index.js';
import { extrairAutoria } from '../utils/autoria.js';

const STATUS_UI: Record<Emprestimo['status'], StatusLoanUI> = {
    AGENDADO: 'agendado',
    ABERTO: 'aberto',
    DEVOLVIDO: 'devolvido'
};

/** Converte o empréstimo da API no formato usado pelas telas (e pela exportação). */
export function mapEmprestimo(loan: Emprestimo): LoanUI {
    return {
        id: loan.id,
        numero: loan.id,
        aluno: loan.solicitanteNome,
        responsavel: loan.responsavel?.nome ?? '',
        responsavelId: loan.responsavelId,
        status: STATUS_UI[loan.status] ?? 'devolvido',
        data: loan.dataRetirada,
        dataAgendada: loan.dataAgendada ?? null,
        dataPrevistaDevolucao: loan.dataPrevistaDevolucao ?? null,
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
