import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { getLoans } from '../../core/state/loanStore.js';
import { getOcorrenciasPorTipo } from '../../core/state/ocorrenciasStore.js';
import { contarManutencaoPorEquipamento } from '../../core/utils/estoqueCalculado.js';
import { gerarLinhasCsv, baixarArquivoCsv } from '../../core/services/csv.js';
import { gerarArquivoXlsx, baixarArquivoXlsx } from '../../core/services/excel.js';
import { gerarBaixarPdf } from '../../core/services/pdf.js';
import type { Equipamento, LoanUI, FiltrosExportacao } from '../../types/index.js';

const FORMATOS_SUPORTADOS = ['csv', 'excel', 'pdf'];

/* ===== 1. data preparation ===== */

export function prepararDadosEquipamentos(): Equipamento[] {
    return getEquipamentos();
}

export function prepararDadosEmprestimos(): LoanUI[] {
    return getLoans();
}

/* ===== 2. filtering ===== */

export function filtrarPorPeriodo<T>(
    itens: T[],
    dataInicial: string,
    dataFinal: string,
    obterData: (item: T) => Date
): T[] {
    if (!dataInicial && !dataFinal) return itens;

    const inicio = dataInicial ? new Date(dataInicial) : null;
    const fim = dataFinal ? new Date(dataFinal) : null;

    return itens.filter((item) => {
        const data = obterData(item);
        if (inicio && data < inicio) return false;
        if (fim && data > fim) return false;
        return true;
    });
}

export function filtrarEquipamentosPorIds(equipamentos: Equipamento[], idsSelecionados: string[]): Equipamento[] {
    if (!idsSelecionados.length) return equipamentos;
    const idsSet = new Set(idsSelecionados.map(String));
    return equipamentos.filter((equipamento) => idsSet.has(String(equipamento.id)));
}

/* ===== 3. formatting ===== */

const CABECALHO_EQUIPAMENTOS = ['Categoria', 'Modelo', 'Total', 'Disponivel', 'Em Manutencao', 'Quebrado'];
const CABECALHO_EMPRESTIMOS = ['Numero', 'Solicitante', 'Responsavel', 'Retirada', 'Devolucao', 'Status'];

function linhasEquipamentos(equipamentos: Equipamento[]): Array<Array<string | number>> {
    const manutencaoPorEquipamento = contarManutencaoPorEquipamento(getOcorrenciasPorTipo('manutencao'));

    return equipamentos.map((equipamento) => [
        equipamento.categoria?.nome ?? '',
        equipamento.modelo,
        equipamento.quantidadeTotal,
        equipamento.quantidadeDisponivel,
        manutencaoPorEquipamento.get(String(equipamento.id)) ?? 0,
        equipamento.quantidadeQuebrada
    ]);
}

function linhasEmprestimos(emprestimos: LoanUI[]): Array<Array<string | number>> {
    return emprestimos.map((loan) => [
        loan.numero,
        loan.aluno,
        loan.responsavel,
        loan.data,
        loan.dataDevolucao || '',
        loan.status
    ]);
}

/* ===== 4. orchestration ===== */

export function exportarDados(filtros: FiltrosExportacao): void {
    if (!FORMATOS_SUPORTADOS.includes(filtros.formato)) {
        throw new Error('Formato de exportação inválido.');
    }

    let cabecalho: string[];
    let linhas: Array<Array<string | number>>;
    let prefixoArquivo: string;
    let titulo: string;

    if (filtros.tipoDados === 'equipamentos') {
        const equipamentosFiltrados = filtrarEquipamentosPorIds(prepararDadosEquipamentos(), filtros.equipamentoIds);
        cabecalho = CABECALHO_EQUIPAMENTOS;
        linhas = linhasEquipamentos(equipamentosFiltrados);
        prefixoArquivo = 'equipamentos';
        titulo = 'Relatório de Equipamentos — eduAssets';
    } else if (filtros.tipoDados === 'devolucoes') {
        const emprestimosFiltrados = filtrarPorPeriodo(
            prepararDadosEmprestimos(),
            filtros.dataInicial,
            filtros.dataFinal,
            (loan) => loan.createdAt
        );
        cabecalho = CABECALHO_EMPRESTIMOS;
        linhas = linhasEmprestimos(emprestimosFiltrados);
        prefixoArquivo = 'emprestimos';
        titulo = 'Relatório de Empréstimos e Devoluções — eduAssets';
    } else {
        throw new Error('Tipo de dados inválido para exportação.');
    }

    if (!linhas.length) {
        throw new Error('Nenhum registro encontrado para os filtros selecionados.');
    }

    const nomeBase = `${prefixoArquivo}-eduassets-${new Date().toISOString().slice(0, 10)}`;
    const linhasExtras: Array<Array<string | number>> = filtros.observacao ? [[`Observação: ${filtros.observacao}`], []] : [];

    if (filtros.formato === 'csv') {
        baixarArquivoCsv(gerarLinhasCsv(cabecalho, linhas, linhasExtras), `${nomeBase}.csv`);
        return;
    }

    if (filtros.formato === 'excel') {
        baixarArquivoXlsx(gerarArquivoXlsx(cabecalho, linhas, 'Dados', linhasExtras), `${nomeBase}.xlsx`);
        return;
    }

    gerarBaixarPdf(titulo, cabecalho, linhas, `${nomeBase}.pdf`, filtros.observacao);
}