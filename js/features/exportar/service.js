import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { getLoans } from '../../core/state/loanStore.js';
import { gerarLinhasCsv, baixarArquivoCsv } from '../../core/services/csv.js';

const FORMATOS_SUPORTADOS = ['csv'];

/* ===== data preparation: fetch data from the store, without filtering ===== */

export function prepararDadosEquipamentos() {
    return getEquipamentos();
}

export function prepararDadosEmprestimos() {
    return getLoans();
}

/* ===== 2. filtering ===== */

export function filtrarPorPeriodo(itens, dataInicial, dataFinal, obterData) {
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

// future: add filtering by subtype/equipment type when the subtype field exists in the HTML.)

/* ===== 3. formatting ===== */

function linhasCsvEquipamentos(equipamentos) {
    return equipamentos.map((equipamento) => [
        equipamento.categoria?.nome ?? '',
        equipamento.modelo,
        equipamento.quantidadeTotal,
        equipamento.quantidadeDisponivel,
        equipamento.quantidadeQuebrada
    ]);
}

function linhasCsvEmprestimos(emprestimos) {
    return emprestimos.map((loan) => [
        loan.numero,
        loan.aluno,
        loan.responsavel,
        loan.data,
        loan.dataDevolucao || '',
        loan.status
    ]);
}

/* ===== 4. orchestration: coordinate the export process ===== */

export function exportarDados(filtros) {
    if (!FORMATOS_SUPORTADOS.includes(filtros.formato)) {
        throw new Error(`Exportação em ${filtros.formato.toUpperCase()} ainda não está disponível. Use CSV por enquanto.`);
    }

    if (filtros.tipoDados === 'equipamentos') {
        const csv = gerarLinhasCsv(
            ['Categoria', 'Modelo', 'Total', 'Disponivel', 'Quebrado'],
            linhasCsvEquipamentos(prepararDadosEquipamentos())
        );
        baixarArquivoCsv(csv, montarNomeArquivo('equipamentos'));
        return;
    }

    if (filtros.tipoDados === 'devolucoes') {
        const emprestimosFiltrados = filtrarPorPeriodo(
            prepararDadosEmprestimos(),
            filtros.dataInicial,
            filtros.dataFinal,
            (loan) => loan.createdAt
        );

        const csv = gerarLinhasCsv(
            ['Numero', 'Solicitante', 'Responsavel', 'Retirada', 'Devolucao', 'Status'],
            linhasCsvEmprestimos(emprestimosFiltrados)
        );
        baixarArquivoCsv(csv, montarNomeArquivo('emprestimos'));
        return;
    }

    throw new Error('Tipo de dados inválido para exportação.');
}

function montarNomeArquivo(prefixo) {
    return `${prefixo}-eduassets-${new Date().toISOString().slice(0, 10)}.csv`;
}