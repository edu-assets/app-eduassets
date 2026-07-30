import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { getLoans } from '../../core/state/loanStore.js';
import { getOcorrenciasPorTipo } from '../../core/state/ocorrenciasStore.js';
import { gerarLinhasCsv, baixarArquivoCsv } from '../../core/services/csv.js';
import { gerarArquivoXlsx, baixarArquivoXlsx } from '../../core/services/excel.js';
import { gerarBaixarPdf } from '../../core/services/pdf.js';

const FORMATOS_SUPORTADOS = ['csv', 'excel', 'pdf'];

/* ===== 1. data preparation: fetch data from the store, without filtering ===== */

export function prepararDadosEquipamentos() {
    return getEquipamentos();
}

export function prepararDadosEmprestimos() {
    return getLoans();
}

/** Quantidade de unidades em manutenção aberta, por equipamentoId. */
function contarManutencaoPorEquipamento() {
    const mapa = new Map();
    getOcorrenciasPorTipo('manutencao').forEach((ocorrencia) => {
        const id = String(ocorrencia.equipamentoId);
        mapa.set(id, (mapa.get(id) ?? 0) + 1);
    });
    return mapa;
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

export function filtrarEquipamentosPorIds(equipamentos, idsSelecionados) {
    if (!idsSelecionados.length) return equipamentos;
    const idsSet = new Set(idsSelecionados.map(String));
    return equipamentos.filter((equipamento) => idsSet.has(String(equipamento.id)));
}

export function filtrarEmprestimosPorEquipamentos(emprestimos, idsSelecionados) {
    if (!idsSelecionados.length) return emprestimos;
    const idsSet = new Set(idsSelecionados.map(String));
    return emprestimos.filter((loan) => loan.itens.some((item) => idsSet.has(String(item.id))));
}

/* ===== 3. formatting ===== */

const CABECALHO_EQUIPAMENTOS = ['Categoria', 'Modelo', 'Total', 'Disponivel', 'Em Manutencao', 'Quebrado'];
const CABECALHO_EMPRESTIMOS = ['Numero', 'Solicitante', 'Responsavel', 'Retirada', 'Devolucao', 'Status'];

function linhasEquipamentos(equipamentos) {
    const manutencaoPorEquipamento = contarManutencaoPorEquipamento();

    return equipamentos.map((equipamento) => [
        equipamento.categoria?.nome ?? '',
        equipamento.modelo,
        equipamento.quantidadeTotal,
        equipamento.quantidadeDisponivel,
        manutencaoPorEquipamento.get(String(equipamento.id)) ?? 0,
        equipamento.quantidadeQuebrada
    ]);
}

function linhasEmprestimos(emprestimos) {
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
        throw new Error('Formato de exportação inválido.');
    }

    let cabecalho;
    let linhas;
    let prefixoArquivo;
    let titulo;

    if (filtros.tipoDados === 'equipamentos') {
        const equipamentosFiltrados = filtrarEquipamentosPorIds(prepararDadosEquipamentos(), filtros.equipamentoIds);
        cabecalho = CABECALHO_EQUIPAMENTOS;
        linhas = linhasEquipamentos(equipamentosFiltrados);
        prefixoArquivo = 'equipamentos';
        titulo = 'Relatório de Equipamentos — eduAssets';
    } else if (filtros.tipoDados === 'devolucoes') {
        let emprestimosFiltrados = filtrarPorPeriodo(
            prepararDadosEmprestimos(),
            filtros.dataInicial,
            filtros.dataFinal,
            (loan) => loan.createdAt
        );
        emprestimosFiltrados = filtrarEmprestimosPorEquipamentos(emprestimosFiltrados, filtros.equipamentoIds);
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
    const linhasExtras = filtros.observacao ? [[`Observação: ${filtros.observacao}`], []] : [];

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