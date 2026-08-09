import { listarEmprestimos, criarEmprestimo, atualizarItensEmprestimo, devolverEmprestimo } from '../api/emprestimos.js';
import type { Emprestimo, LoanUI, LoanDraft, LoanUpdate } from '../../types/index.js';

type LoanListener = (emprestimos: LoanUI[]) => void;

let emprestimos: LoanUI[] = [];
let listeners: LoanListener[] = [];

export async function carregarEmprestimos(): Promise<LoanUI[]> {
    const dados = await listarEmprestimos();
    emprestimos = dados.map(mapEmprestimo);
    notify();
    return emprestimos;
}

export function getLoans(): LoanUI[] {
    return emprestimos;
}

export function getLoansAbertos(): LoanUI[] {
    return emprestimos.filter((loan) => loan.status === 'aberto');
}

export async function addLoan(loan: LoanDraft): Promise<void> {
    await criarEmprestimo({
        solicitanteNome: loan.aluno,
        responsavelId: Number(loan.responsavelId),
        dataRetirada: loan.dataRetiradaISO,
        observacao: loan.observacao || undefined,
        itens: loan.itens.map((item) => ({ equipamentoId: Number(item.id), quantidade: item.quantidade }))
    });
    await carregarEmprestimos();
}

export async function returnLoan(id: number): Promise<void> {
    await devolverEmprestimo(id);
    await carregarEmprestimos();
}

export async function updateLoan(id: number, updates: LoanUpdate): Promise<void> {
    if (updates.itens) {
        // Conversão para number é necessária: a API espera equipamentoId numérico.
        await atualizarItensEmprestimo(id, updates.itens.map((item) => ({
            equipamentoId: Number(item.id),
            quantidade: item.quantidade
        })));
    }
    await carregarEmprestimos();
}

export function subscribe(callback: LoanListener): () => void {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function notify(): void {
    listeners.forEach((callback) => callback(emprestimos));
}

function mapEmprestimo(loan: Emprestimo): LoanUI {
    return {
        id: loan.id,
        numero: loan.id,
        aluno: loan.solicitanteNome,
        responsavel: loan.responsavel?.nome ?? '',
        responsavelId: loan.responsavelId,
        status: loan.status === 'ABERTO' ? 'aberto' : 'devolvido',
        data: new Date(loan.dataRetirada).toLocaleString('pt-BR'),
        dataDevolucao: loan.dataDevolucao ? new Date(loan.dataDevolucao).toLocaleString('pt-BR') : null,
        observacao: loan.observacao ?? '',
        createdAt: new Date(loan.createdAt),
        itens: (loan.itens ?? []).map((item) => ({
            id: item.equipamentoId,
            nome: item.equipamento?.modelo ?? '',
            quantidade: item.quantidade
        }))
    };
}