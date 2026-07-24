import { listarEmprestimos, criarEmprestimo, atualizarItensEmprestimo, devolverEmprestimo } from '../api/emprestimos.js';

let emprestimos = [];
let listeners = [];

export async function carregarEmprestimos() {
    const dados = await listarEmprestimos();
    emprestimos = dados.map(mapEmprestimo);
    notify();
    return emprestimos;
}

export function getLoans() {
    return emprestimos;
}

export function getLoansAbertos() {
    return emprestimos.filter((loan) => loan.status === 'aberto');
}

export async function addLoan(loan) {
    await criarEmprestimo({
        solicitanteNome: loan.aluno,
        responsavelId: Number(loan.responsavelId),
        dataRetirada: loan.dataRetiradaISO,
        observacao: loan.observacao || undefined,
        itens: loan.itens.map((item) => ({ equipamentoId: Number(item.id), quantidade: item.quantidade }))
    });
    await carregarEmprestimos();
}

export async function returnLoan(id) {
    await devolverEmprestimo(id);
    await carregarEmprestimos();
}

export async function updateLoan(id, updates) {
    if (updates.itens) {
        await atualizarItensEmprestimo(id, updates.itens.map((item) => ({ equipamentoId: Number(item.id), quantidade: item.quantidade })));
    }
    await carregarEmprestimos();
}

export function subscribe(callback) {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function notify() {
    listeners.forEach((callback) => callback(emprestimos));
}

function mapEmprestimo(loan) {
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