import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { getLoansAbertos } from '../../core/state/loanStore.js';
import { getOcorrenciasPorTipo } from '../../core/state/ocorrenciasStore.js';
import { gerarLinhasCsv, baixarArquivoCsv } from '../../core/services/csv.js';
import { contarEmprestadoPorEquipamento, contarManutencaoPorEquipamento } from '../../core/utils/estoqueCalculado.js';

/* ===== Data processing: calculations, data transformations ===== */

export function calcularResumo(equipamentos) {
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

export function calcularEmprestado(equipamento, loansAbertos = getLoansAbertos()) {
    return contarEmprestadoPorEquipamento(loansAbertos).get(String(equipamento.id)) ?? 0;
}

export function calcularManutencao(equipamento, ocorrenciasManutencao = getOcorrenciasPorTipo('manutencao')) {
    return contarManutencaoPorEquipamento(ocorrenciasManutencao).get(String(equipamento.id)) ?? 0;
}

export function buscarEquipamentoPorId(id, equipamentos = getEquipamentos()) {
    return equipamentos.find((equipamento) => String(equipamento.id) === String(id)) ?? null;
}

export function gerarCsvEstoque(equipamentos) {
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

function formatarPct(valor, total) {
    if (!total) return '0%';
    return `${(valor / total * 100).toFixed(1).replace('.', ',')}%`;
}

/* ===== Actions ===== */

export function exportarEstoqueCsv(equipamentos) {
    const csv = gerarCsvEstoque(equipamentos);
    const nomeArquivo = `estoque-eduassets-${new Date().toISOString().slice(0, 10)}.csv`;
    baixarArquivoCsv(csv, nomeArquivo);
}