import { listarEmprestimos, criarEmprestimo, atualizarItensEmprestimo, devolverEmprestimo } from '../api/emprestimos.js';
import type { Emprestimo, LoanUI, LoanDraft, LoanUpdate } from '../../types/index.js';
import type { OpcoesLeitura } from '../api/apiClient.js';
import { getSessionDataVersion } from './sessionDataVersion.js';
import { carregarEquipamentos } from './equipamentoStore.js';
import { criarLeituraOrdenada, mesmoConteudo } from './leituraOrdenada.js';

type LoanListener = (emprestimos: LoanUI[]) => void;

let emprestimos: LoanUI[] = [];
let listeners: LoanListener[] = [];

const leituras = criarLeituraOrdenada();

export async function carregarEmprestimos(opcoes?: OpcoesLeitura): Promise<LoanUI[]> {
    const version = getSessionDataVersion();
    const leitura = leituras.iniciar();
    const dados = await listarEmprestimos(opcoes);
    if (version !== getSessionDataVersion() || !leituras.podeAplicar(leitura)) return emprestimos;
    const novos = dados.map(mapEmprestimo);
    if (mesmoConteudo(novos, emprestimos)) return emprestimos;
    emprestimos = novos;
    notify();
    return emprestimos;
}

export function getLoans(): LoanUI[] {
    return emprestimos;
}

export function limparEmprestimos(): void {
    emprestimos = [];
    notify();
}

export function getLoansAbertos(): LoanUI[] {
    return emprestimos.filter((loan) => loan.status === 'aberto');
}

export async function addLoan(loan: LoanDraft): Promise<void> {
    await criarEmprestimo({
        solicitanteNome: loan.aluno,
        responsavelId: Number(loan.responsavelId),
        ...(loan.dataRetiradaISO ? { dataRetirada: loan.dataRetiradaISO } : {}),
        observacao: loan.observacao || undefined,
        itens: loan.itens.map((item) => ({ equipamentoId: Number(item.id), quantidade: item.quantidade }))
    });
    await recarregarAposMutacao();
}

/** Sem `dataDevolucao` o servidor registra a devolução com o próprio horário. */
/** Retorna o empréstimo devolvido (com a data gravada pelo servidor). */
export async function returnLoan(id: number, dataDevolucao?: string): Promise<Emprestimo> {
    const devolvido = await devolverEmprestimo(id, dataDevolucao);
    await recarregarAposMutacao();
    return devolvido;
}

export async function updateLoan(id: number, updates: LoanUpdate): Promise<void> {
    if (updates.itens) {
        // Conversão para number é necessária: a API espera equipamentoId numérico.
        await atualizarItensEmprestimo(id, updates.itens.map((item) => ({
            equipamentoId: Number(item.id),
            quantidade: item.quantidade
        })));
    }
    await recarregarAposMutacao();
}

// Empréstimo, devolução e edição de itens alteram as quantidades dos equipamentos no servidor.
async function recarregarAposMutacao(): Promise<void> {
    // A operação já foi aplicada: uma falha ao recarregar as listas não deve parecer falha do registro
    // (o usuário repetiria a ação e duplicaria o registro); a sincronização ao vivo corrige em seguida.
    const resultados = await Promise.allSettled([carregarEmprestimos(), carregarEquipamentos()]);
    resultados.forEach((resultado) => {
        if (resultado.status === 'rejected') console.warn('[eduAssets] Falha ao recarregar após a operação:', resultado.reason);
    });
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
