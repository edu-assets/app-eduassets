import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { getLoansAbertos } from '../../core/state/loanStore.js';
import { getOcorrenciasPorTipo } from '../../core/state/ocorrenciasStore.js';
import { gerarLinhasCsv, baixarArquivoCsv } from '../../core/services/csv.js';
import { contarEmprestadoPorEquipamento, contarManutencaoPorEquipamento } from '../../core/utils/estoqueCalculado.js';
import type { Equipamento, LoanUI, OcorrenciaUI, ResumoDashboard } from '../../types/index.js';

/* ===== Data processing: calculations, data transformations ===== */

export function calcularResumo(equipamentos: Equipamento[]): ResumoDashboard {
    const emprestadoPorEquipamento = contarEmprestadoPorEquipamento(getLoansAbertos());
    const manutencaoPorEquipamento = contarManutencaoPorEquipamento(getOcorrenciasPorTipo('manutencao'));

    let totalGeral = 0;
    let dispGeral = 0;
    let quebGeral = 0;
    let emprestGeral = 0;
    let manutGeral = 0;

    equipamentos.forEach((equipamento) => {
        const id = String(equipamento.id);
        totalGeral += Number(equipamento.quantidadeTotal) || 0;
        dispGeral += Number(equipamento.quantidadeDisponivel) || 0;
        quebGeral += Number(equipamento.quantidadeQuebrada) || 0;
        emprestGeral += emprestadoPorEquipamento.get(id) ?? 0;
        manutGeral += manutencaoPorEquipamento.get(id) ?? 0;
    });

    return {
        total: totalGeral,
        disponivel: dispGeral,
        emprestado: emprestGeral,
        manutencao: manutGeral,
        quebrado: quebGeral,
        disponivelPct: formatarPct(dispGeral, totalGeral),
        emprestadoPct: formatarPct(emprestGeral, totalGeral),
        manutencaoPct: formatarPct(manutGeral, totalGeral),
        quebradoPct: formatarPct(quebGeral, totalGeral)
    };
}

export function calcularEmprestado(equipamento: Equipamento, loansAbertos: LoanUI[] = getLoansAbertos()): number {
    return contarEmprestadoPorEquipamento(loansAbertos).get(String(equipamento.id)) ?? 0;
}

export function calcularManutencao(
    equipamento: Equipamento,
    ocorrenciasManutencao: OcorrenciaUI[] = getOcorrenciasPorTipo('manutencao')
): number {
    return contarManutencaoPorEquipamento(ocorrenciasManutencao).get(String(equipamento.id)) ?? 0;
}

export function buscarEquipamentoPorId(
    id: string | number,
    equipamentos: Equipamento[] = getEquipamentos()
): Equipamento | null {
    return equipamentos.find((equipamento) => String(equipamento.id) === String(id)) ?? null;
}

export function gerarCsvEstoque(equipamentos: Equipamento[]): string {
    const manutencaoPorEquipamento = contarManutencaoPorEquipamento(getOcorrenciasPorTipo('manutencao'));

    const linhas = equipamentos.map((equipamento) => [
        equipamento.categoria?.nome ?? '',
        equipamento.quantidadeTotal,
        equipamento.quantidadeDisponivel,
        manutencaoPorEquipamento.get(String(equipamento.id)) ?? 0,
        equipamento.quantidadeQuebrada
    ]);

    return gerarLinhasCsv(['Categoria', 'Total', 'Disponivel', 'Em Manutencao', 'Quebrado'], linhas);
}

function formatarPct(valor: number, total: number): string {
    if (!total) return '0%';
    return `${(valor / total * 100).toFixed(1).replace('.', ',')}%`;
}

/* ===== Actions ===== */

export function exportarEstoqueCsv(equipamentos: Equipamento[]): void {
    const csv = gerarCsvEstoque(equipamentos);
    const nomeArquivo = `estoque-eduassets-${new Date().toISOString().slice(0, 10)}.csv`;
    baixarArquivoCsv(csv, nomeArquivo);
}

/* ===== Filtering ===== */

export function filtrarEquipamentos(equipamentos: Equipamento[], termo: string): Equipamento[] {
    if (!termo.trim()) return equipamentos;
    const termoMin = termo.toLowerCase();
    
    return equipamentos.filter((eq) => 
        (eq.categoria?.nome || '').toLowerCase().includes(termoMin)
    );
}

export function filtrarHistorico(loans: LoanUI[], termo: string): LoanUI[] {
    if (!termo.trim()) return loans;
    const termoMin = termo.toLowerCase();
    
    return loans.filter((loan) => 
        String(loan.numero).includes(termoMin) ||
        (loan.aluno || '').toLowerCase().includes(termoMin) ||
        (loan.responsavel || '').toLowerCase().includes(termoMin)
    );
}