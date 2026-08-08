import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { getLoans } from '../../core/state/loanStore.js';
import { getOcorrenciasPorTipo } from '../../core/state/ocorrenciasStore.js';
import { gerarLinhasCsv, baixarArquivoCsv } from '../../core/services/csv.js';
import { gerarArquivoXlsx, baixarArquivoXlsx } from '../../core/services/excel.js';
import { gerarBaixarPdf } from '../../core/services/pdf.js';
import type { PdfTabelaSecao } from '../../core/services/pdf.js';
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

/* ===== 3. formatting: main table ===== */

const CABECALHO_EQUIPAMENTOS = ['Categoria', 'Modelo', 'Total', 'Disponivel', 'Em Manutencao', 'Quebrado'];
const CABECALHO_EMPRESTIMOS = ['Numero', 'Solicitante', 'Responsavel', 'Retirada', 'Devolucao', 'Status'];

function linhasEquipamentos(equipamentos: Equipamento[]): Array<Array<string | number>> {
    const manutencaoPorEquipamento = contarManutencaoPorEquipamentoLocal();

    return equipamentos.map((equipamento) => [
        equipamento.categoria?.nome ?? '',
        equipamento.modelo,
        equipamento.quantidadeTotal,
        equipamento.quantidadeDisponivel,
        manutencaoPorEquipamento.get(String(equipamento.id)) ?? 0,
        equipamento.quantidadeQuebrada
    ]);
}

function contarManutencaoPorEquipamentoLocal(): Map<string, number> {
    const mapa = new Map<string, number>();
    getOcorrenciasPorTipo('manutencao').forEach((ocorrencia) => {
        const id = String(ocorrencia.equipamentoId);
        mapa.set(id, (mapa.get(id) ?? 0) + 1);
    });
    return mapa;
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

/* ===== 4. formatting: detailed occurrence sections (Manutenção / Quebrado / Observação abertas) ===== */

interface OcorrenciaExportLinha {
    categoria: string;
    modelo: string;
    numero: string;
    problema: string;
    descricao: string;
    registradoEm: string;
}

interface SecaoOcorrenciasExport {
    titulo: string;
    corRgb: [number, number, number];
    linhas: OcorrenciaExportLinha[];
}

const PROBLEMA_LABELS: Record<string, string> = {
    tela: 'Tela',
    audio: 'Áudio',
    bateria: 'Bateria',
    cabo: 'Cabo',
    touch: 'Touch',
    teclado: 'Teclado',
    botao: 'Botão',
    carcaca: 'Carcaça',
    outro: 'Outro'
};

const SECOES_OCORRENCIAS_CONFIG: Array<{ tipo: string; titulo: string; corRgb: [number, number, number] }> = [
    { tipo: 'manutencao', titulo: 'Em Manutenção', corRgb: [216, 67, 21] },
    { tipo: 'quebrado', titulo: 'Quebrados', corRgb: [198, 40, 40] },
    { tipo: 'observacao', titulo: 'Observações', corRgb: [2, 119, 189] }
];

const CABECALHO_OCORRENCIAS = ['Categoria', 'Modelo', 'Número', 'Problema', 'Descrição', 'Registrado em'];

function montarSecoesOcorrencias(equipamentoIds: string[]): SecaoOcorrenciasExport[] {
    const idsSet = equipamentoIds.length ? new Set(equipamentoIds.map(String)) : null;

    return SECOES_OCORRENCIAS_CONFIG
        .map(({ tipo, titulo, corRgb }) => {
            const registros = getOcorrenciasPorTipo(tipo).filter(
                (ocorrencia) => !idsSet || idsSet.has(String(ocorrencia.equipamentoId))
            );

            const linhas: OcorrenciaExportLinha[] = registros.map((ocorrencia) => ({
                categoria: ocorrencia.categoria,
                modelo: ocorrencia.modelo,
                numero: ocorrencia.numero,
                problema: PROBLEMA_LABELS[ocorrencia.problema] ?? ocorrencia.problema,
                descricao: ocorrencia.descricao,
                registradoEm: ocorrencia.registradoEm
            }));

            return { titulo, corRgb, linhas };
        })
        .filter((secao) => secao.linhas.length > 0);
}

function linhasSecaoParaMatriz(secao: SecaoOcorrenciasExport): Array<Array<string | number>> {
    return secao.linhas.map((l) => [l.categoria, l.modelo, l.numero, l.problema, l.descricao, l.registradoEm]);
}

function montarMatrizCompleta(
    cabecalho: string[],
    linhas: Array<Array<string | number>>,
    secoes: SecaoOcorrenciasExport[],
    observacaoGeral: string
): Array<Array<string | number>> {
    const matriz: Array<Array<string | number>> = [];

    if (observacaoGeral) {
        matriz.push([`Observação: ${observacaoGeral}`], []);
    }

    matriz.push(cabecalho, ...linhas);

    secoes.forEach((secao) => {
        matriz.push([], [`${secao.titulo} (${secao.linhas.length})`], CABECALHO_OCORRENCIAS, ...linhasSecaoParaMatriz(secao));
    });

    return matriz;
}

/* ===== 5. orchestration ===== */

export function exportarDados(filtros: FiltrosExportacao): void {
    if (!FORMATOS_SUPORTADOS.includes(filtros.formato)) {
        throw new Error('Formato de exportação inválido.');
    }

    let cabecalho: string[];
    let linhas: Array<Array<string | number>>;
    let prefixoArquivo: string;
    let titulo: string;
    let secoes: SecaoOcorrenciasExport[] = [];

    if (filtros.tipoDados === 'equipamentos') {
        const equipamentosFiltrados = filtrarEquipamentosPorIds(prepararDadosEquipamentos(), filtros.equipamentoIds);
        cabecalho = CABECALHO_EQUIPAMENTOS;
        linhas = linhasEquipamentos(equipamentosFiltrados);
        prefixoArquivo = 'equipamentos';
        titulo = 'Relatório de Equipamentos';
        secoes = montarSecoesOcorrencias(filtros.equipamentoIds);
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
        titulo = 'Relatório de Empréstimos e Devoluções';
    } else {
        throw new Error('Tipo de dados inválido para exportação.');
    }

    if (!linhas.length) {
        throw new Error('Nenhum registro encontrado para os filtros selecionados.');
    }

    const nomeBase = `${prefixoArquivo}-eduassets-${new Date().toISOString().slice(0, 10)}`;

    if (filtros.formato === 'csv') {
        const matriz = montarMatrizCompleta(cabecalho, linhas, secoes, filtros.observacao);
        baixarArquivoCsv(gerarLinhasCsv(matriz), `${nomeBase}.csv`);
        return;
    }

    if (filtros.formato === 'excel') {
        const matriz = montarMatrizCompleta(cabecalho, linhas, secoes, filtros.observacao);
        baixarArquivoXlsx(gerarArquivoXlsx(matriz, 'Dados'), `${nomeBase}.xlsx`);
        return;
    }

    const secoesPdf: PdfTabelaSecao[] = secoes.map((secao) => ({
        titulo: `${secao.titulo} (${secao.linhas.length})`,
        corRgb: secao.corRgb,
        cabecalho: CABECALHO_OCORRENCIAS,
        linhas: linhasSecaoParaMatriz(secao)
    }));

    gerarBaixarPdf(titulo, cabecalho, linhas, `${nomeBase}.pdf`, filtros.observacao, secoesPdf);
}