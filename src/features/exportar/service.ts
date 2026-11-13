import { showToast } from '../../core/ui/index.js';
import { t } from '../../core/state/i18nStore.js';
import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { listarTodasPaginasEmprestimos } from '../../core/api/emprestimos.js';
import { mapEmprestimo } from '../../core/state/loanMapper.js';
import { getOcorrenciasPorTipo } from '../../core/state/ocorrenciasStore.js';
import { gerarLinhasCsv, baixarArquivoCsv } from '../../core/services/csv.js';
import { gerarArquivoXlsx, baixarArquivoXlsx } from '../../core/services/excel.js';
import { gerarBaixarPdf } from '../../core/services/pdf.js';
import type { PdfTabelaSecao } from '../../core/services/pdf.js';
import type { Equipamento, LoanUI, FiltrosExportacao } from '../../types/index.js';
import { isAutenticado } from '../../core/state/authStore.js';
export { filtrarPorPeriodo } from './dateFilters.js';

const FORMATOS_SUPORTADOS = ['csv', 'excel', 'pdf'];

/* ===== 1. data preparation ===== */

export function prepararDadosEquipamentos(): Equipamento[] {
    return getEquipamentos();
}

/**
 * Todos os empréstimos do período (dias locais AAAA-MM-DD; vazio = sem limite), lidos direto da API página a página
 * (`paginado=1`, limit 100) em vez da lista paginada da tela. O período vale sobre a data de retirada.
 */
export async function prepararDadosEmprestimos(dataInicial = '', dataFinal = ''): Promise<LoanUI[]> {
    const { items, completo } = await listarTodasPaginasEmprestimos({
        autenticado: isAutenticado(),
        filtros: { de: dataInicial || undefined, ate: dataFinal || undefined }
    });
    if (!completo) {
        console.warn('[eduAssets] Exportação de empréstimos truncada no limite de páginas.');
        showToast(t('feedback.exportacao_truncada'), 'warning');
    }
    return items.map(mapEmprestimo);
}

/* ===== 2. filtering ===== */

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

function nomeAutor(autor: { nome: string } | null | undefined): string {
    return autor?.nome ?? '—';
}

function linhasEmprestimos(emprestimos: LoanUI[], comAutoria = false): Array<Array<string | number>> {
    return emprestimos.map((loan) => [
        loan.numero,
        loan.aluno,
        loan.responsavel,
        loan.data,
        loan.dataDevolucao || '',
        loan.status,
        ...(comAutoria ? [nomeAutor(loan.criadoPor), loan.status === 'devolvido' ? nomeAutor(loan.devolvidoPor) : ''] : [])
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
    criadaPor?: string;
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

function montarSecoesOcorrencias(equipamentoIds: string[], comAutoria = false): SecaoOcorrenciasExport[] {
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
                registradoEm: ocorrencia.registradoEm,
                ...(comAutoria ? { criadaPor: nomeAutor(ocorrencia.criadoPor) } : {})
            }));

            return { titulo, corRgb, linhas };
        })
        .filter((secao) => secao.linhas.length > 0);
}

function linhasSecaoParaMatriz(secao: SecaoOcorrenciasExport, comAutoria = false): Array<Array<string | number>> {
    return secao.linhas.map((l) => [
        l.categoria, l.modelo, l.numero, l.problema, l.descricao, l.registradoEm,
        ...(comAutoria ? [l.criadaPor ?? '—'] : [])
    ]);
}

const CABECALHO_AUTORIA_EMPRESTIMOS = ['Registrado por', 'Devolvido por'];
const CABECALHO_AUTORIA_OCORRENCIAS = ['Criada por'];

function cabecalhoOcorrencias(comAutoria: boolean): string[] {
    return comAutoria ? [...CABECALHO_OCORRENCIAS, ...CABECALHO_AUTORIA_OCORRENCIAS] : CABECALHO_OCORRENCIAS;
}

function montarMatrizCompleta(
    cabecalho: string[],
    linhas: Array<Array<string | number>>,
    secoes: SecaoOcorrenciasExport[],
    observacaoGeral: string,
    comAutoria = false
): Array<Array<string | number>> {
    const matriz: Array<Array<string | number>> = [];

    if (observacaoGeral) {
        matriz.push([`Observação: ${observacaoGeral}`], []);
    }

    matriz.push(cabecalho, ...linhas);

    secoes.forEach((secao) => {
        matriz.push([], [`${secao.titulo} (${secao.linhas.length})`], cabecalhoOcorrencias(comAutoria), ...linhasSecaoParaMatriz(secao, comAutoria));
    });

    return matriz;
}

/* ===== 5. orchestration ===== */

export async function exportarDados(filtros: FiltrosExportacao): Promise<void> {
    if (!FORMATOS_SUPORTADOS.includes(filtros.formato)) {
        throw new Error('Formato de exportação inválido.');
    }

    let cabecalho: string[];
    let linhas: Array<Array<string | number>>;
    let prefixoArquivo: string;
    let titulo: string;
    let secoes: SecaoOcorrenciasExport[] = [];
    // Autoria só existe nos dados de usuários autenticados; convidados mantêm as colunas originais.
    const comAutoria = isAutenticado();

    if (filtros.tipoDados === 'equipamentos') {
        const equipamentosFiltrados = filtrarEquipamentosPorIds(prepararDadosEquipamentos(), filtros.equipamentoIds);
        cabecalho = CABECALHO_EQUIPAMENTOS;
        linhas = linhasEquipamentos(equipamentosFiltrados);
        prefixoArquivo = 'equipamentos';
        titulo = 'Relatório de Equipamentos';
        secoes = montarSecoesOcorrencias(filtros.equipamentoIds, comAutoria);
    } else if (filtros.tipoDados === 'devolucoes') {
        const emprestimosFiltrados = await prepararDadosEmprestimos(filtros.dataInicial, filtros.dataFinal);
        cabecalho = comAutoria ? [...CABECALHO_EMPRESTIMOS, ...CABECALHO_AUTORIA_EMPRESTIMOS] : CABECALHO_EMPRESTIMOS;
        linhas = linhasEmprestimos(emprestimosFiltrados, comAutoria);
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
        const matriz = montarMatrizCompleta(cabecalho, linhas, secoes, filtros.observacao, comAutoria);
        baixarArquivoCsv(gerarLinhasCsv(matriz), `${nomeBase}.csv`);
        return;
    }

    if (filtros.formato === 'excel') {
        const matriz = montarMatrizCompleta(cabecalho, linhas, secoes, filtros.observacao, comAutoria);
        const buffer = await gerarArquivoXlsx(matriz, 'Dados');
        baixarArquivoXlsx(buffer, `${nomeBase}.xlsx`);
        return;
    }

    const secoesPdf: PdfTabelaSecao[] = secoes.map((secao) => ({
        titulo: `${secao.titulo} (${secao.linhas.length})`,
        corRgb: secao.corRgb,
        cabecalho: cabecalhoOcorrencias(comAutoria),
        linhas: linhasSecaoParaMatriz(secao, comAutoria)
    }));

    await gerarBaixarPdf(titulo, cabecalho, linhas, `${nomeBase}.pdf`, filtros.observacao, secoesPdf);
}