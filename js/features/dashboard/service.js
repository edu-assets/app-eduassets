import { getEquipamentos, atualizarEquipamentoPorId } from '../../core/state/equipamentoStore.js';
import { gerarLinhasCsv, baixarArquivoCsv } from '../../core/services/csv.js';

/* ===== Data processing: calculations, data transformations ===== */

export function calcularResumo(equipamentos) {
    let totalGeral = 0;
    let dispGeral = 0;
    let quebGeral = 0;

    equipamentos.forEach((equipamento) => {
        totalGeral += Number(equipamento.quantidadeTotal) || 0;
        dispGeral += Number(equipamento.quantidadeDisponivel) || 0;
        quebGeral += Number(equipamento.quantidadeQuebrada) || 0;
    });

    const emprestGeral = Math.max(0, totalGeral - dispGeral - quebGeral);

    return {
        total: totalGeral,
        disponivel: dispGeral,
        emprestado: emprestGeral,
        quebrado: quebGeral,
        disponivelPct: formatarPct(dispGeral, totalGeral),
        emprestadoPct: formatarPct(emprestGeral, totalGeral),
        quebradoPct: formatarPct(quebGeral, totalGeral)
    };
}

export function calcularEmprestado(equipamento) {
    const total = Number(equipamento.quantidadeTotal) || 0;
    const disponivel = Number(equipamento.quantidadeDisponivel) || 0;
    const quebrado = Number(equipamento.quantidadeQuebrada) || 0;
    return Math.max(0, total - disponivel - quebrado);
}

export function buscarEquipamentoPorId(id, equipamentos = getEquipamentos()) {
    return equipamentos.find((equipamento) => String(equipamento.id) === String(id)) ?? null;
}

export function gerarCsvEstoque(equipamentos) {
    const linhas = equipamentos.map((equipamento) => [
        equipamento.categoria?.nome ?? '',
        equipamento.quantidadeTotal,
        equipamento.quantidadeDisponivel,
        equipamento.quantidadeQuebrada
    ]);

    return gerarLinhasCsv(['Categoria', 'Total', 'Disponivel', 'Quebrado'], linhas);
}

function formatarPct(valor, total) {
    if (!total) return '0%';
    return `${(valor / total * 100).toFixed(1).replace('.', ',')}%`;
}

/* ===== Actions: API, store, download ===== */

export async function atualizarCategoria(equipamentoId, dados) {
    await atualizarEquipamentoPorId(equipamentoId, {
        quantidadeTotal: Number(dados.total),
        quantidadeDisponivel: Number(dados.disponivel),
        quantidadeQuebrada: Number(dados.quebrado)
    });
}

export function exportarEstoqueCsv(equipamentos) {
    const csv = gerarCsvEstoque(equipamentos);
    const nomeArquivo = `estoque-eduassets-${new Date().toISOString().slice(0, 10)}.csv`;
    baixarArquivoCsv(csv, nomeArquivo);
}