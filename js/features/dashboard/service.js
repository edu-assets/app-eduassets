import { getEquipamentos, atualizarEquipamentoPorId } from '../../core/state/equipamentoStore.js';

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
    const linhas = [['Categoria', 'Total', 'Disponivel', 'Quebrado']];

    equipamentos.forEach((equipamento) => {
        linhas.push([
            equipamento.categoria?.nome ?? '',
            equipamento.quantidadeTotal,
            equipamento.quantidadeDisponivel,
            equipamento.quantidadeQuebrada
        ]);
    });

    return linhas.map((linha) => linha.join(';')).join('\n');
}

function formatarPct(valor, total) {
    if (!total) return '0%';
    return `${(valor / total * 100).toFixed(1).replace('.', ',')}%`;
}

export async function atualizarCategoria(equipamentoId, dados) {
    await atualizarEquipamentoPorId(equipamentoId, {
        quantidadeTotal: Number(dados.total),
        quantidadeDisponivel: Number(dados.disponivel),
        quantidadeQuebrada: Number(dados.quebrado)
    });
}

export function baixarArquivoCsv(csv, nomeArquivo) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();

    URL.revokeObjectURL(url);
}

export function exportarEstoqueCsv(equipamentos) {
    const csv = gerarCsvEstoque(equipamentos);
    const nomeArquivo = `estoque-eduassets-${new Date().toISOString().slice(0, 10)}.csv`;
    baixarArquivoCsv(csv, nomeArquivo);
}