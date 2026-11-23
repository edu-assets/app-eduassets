import { ApiError } from '../../core/api/index.js';
import { confirmarAcao } from '../../core/ui/confirm.js';
import { criarDataHoraPicker, type FlatpickrInstance } from '../../core/ui/datepicker.js';
import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { capacidade, livreNoIntervalo, proximoHorarioLivre } from '../../core/state/disponibilidade.js';
import { t } from '../../core/state/i18nStore.js';
import { agora } from '../../core/time/serverClock.js';
import { DURACAO_MAXIMA_AGENDAMENTO_MS, inicioMaximoAgendamento, inicioMinimoAgendamento, type ItemDisponibilidade } from '../../core/utils/estoque.js';
import { formatarErroEstoque, formatarItensEstoqueInsuficiente } from '../../core/utils/erroEstoque.js';
import { html, raw } from '../../core/utils/html.js';
import { limparErroCampo, sinalizarErroCampo } from '../../shared/forms/fieldErrors.js';
import type { ItemEstoqueInsuficiente, LoanDraft, LoanItemUI, PayloadEstoqueInsuficiente } from '../../types/index.js';

/**
 * Fluxo de agendamento do formulário de empréstimo: verificação de disponibilidade no cliente, o modal único de
 * agendamento (retirada futura ou sem unidades agora) e o reenvio quando o servidor recusa
 * por estoque mas o pedido é agendável. A fonte de verdade continua sendo o servidor; a checagem local só decide
 * quando oferecer o agendamento antes de enviar.
 */

export type SituacaoDisponibilidade = 'ok' | 'insuficiente' | 'alem_capacidade';

export interface ResultadoDisponibilidade {
    situacao: SituacaoDisponibilidade;
    /** Itens que não cabem (com o quanto há livre na janela, ou a capacidade quando acima dela). */
    itensFaltantes: ItemEstoqueInsuficiente[];
}

export interface JanelaAgendamento {
    inicio: Date;
    fim: Date;
}

const DURACAO_PADRAO_MS = 3_600_000;

function itensParaDisponibilidade(itens: LoanItemUI[]): ItemDisponibilidade[] {
    const equipamentos = getEquipamentos();
    return itens.flatMap((item) => {
        const equipamento = equipamentos.find((eq) => String(eq.id) === String(item.id));
        return equipamento ? [{ equipamento, quantidade: item.quantidade }] : [];
    });
}

/**
 * Confere os itens na janela [inicio, fim). `imediato` (retirada agora) também exige as unidades na prateleira
 * (`quantidadeDisponivel`). `alem_capacidade` = alguma quantidade excede o total utilizável (nem agendando cabe).
 */
export function verificarDisponibilidade(itens: LoanItemUI[], inicio: Date, fim: Date, imediato: boolean): ResultadoDisponibilidade {
    const equipamentos = getEquipamentos();
    const faltantes: ItemEstoqueInsuficiente[] = [];
    let alemCapacidade = false;

    itens.forEach((item) => {
        const equipamento = equipamentos.find((eq) => String(eq.id) === String(item.id));
        const capacidadeItem = capacidade(equipamento);
        let livre = equipamento ? livreNoIntervalo(equipamento, inicio, fim) : 0;
        if (imediato) livre = Math.min(livre, Number(equipamento?.quantidadeDisponivel) || 0);
        if (item.quantidade <= livre) return;

        const acima = item.quantidade > capacidadeItem;
        if (acima) alemCapacidade = true;
        faltantes.push({
            equipamentoId: Number(item.id),
            nome: item.nome,
            categoria: equipamento?.categoria?.nome ?? '',
            solicitado: item.quantidade,
            disponivel: acima ? capacidadeItem : livre
        });
    });

    return {
        situacao: alemCapacidade ? 'alem_capacidade' : faltantes.length ? 'insuficiente' : 'ok',
        itensFaltantes: faltantes
    };
}

/** Próximo horário (≥ 5 min à frente) em que todos os itens ficam livres por `duracaoMs`; null se não houver. */
export function sugerirInicio(itens: LoanItemUI[], duracaoMs: number): Date | null {
    return proximoHorarioLivre(itensParaDisponibilidade(itens), duracaoMs, { desde: inicioMinimoAgendamento(agora()) });
}

/* ===== Modal de agendamento ===== */

function chipsItensHtml(itens: LoanItemUI[]): string {
    return itens.map((item) => html`
        <span class="modal-summary-item">
            <span class="material-symbols-outlined" aria-hidden="true">inventory_2</span>
            <span class="modal-summary-item-text">${item.quantidade}x ${item.nome}</span>
        </span>`).join('');
}

/** Por que o modal abre: retirada futura escolhida no formulário, ou sem unidades suficientes agora. */
export type MotivoAgendamento = 'futuro' | 'indisponivel';

/**
 * Modal único de agendamento: aviso, Início, Devolução prevista e o resumo dos itens. O título depende do motivo;
 * `inicio` preenche o campo (a retirada escolhida ou o próximo horário livre; null deixa os campos vazios) e o fim
 * começa em início + duração. Resolve a janela escolhida ou null ao cancelar.
 */
export function solicitarAgendamento(
    motivo: MotivoAgendamento,
    inicioSugerido: Date | null,
    itens: LoanItemUI[],
    duracaoMs: number = DURACAO_PADRAO_MS
): Promise<JanelaAgendamento | null> {
    let pickerInicio: FlatpickrInstance | null = null;
    let pickerFim: FlatpickrInstance | null = null;
    let inputInicio: HTMLInputElement | null = null;
    let inputFim: HTMLInputElement | null = null;

    const conteudoHtml = html`
        <div class="modal-fields">
            <div class="modal-callout modal-callout-info">
                <span class="icon-badge icon-badge--sm icon-badge--info">
                    <span class="material-symbols-outlined" aria-hidden="true">info</span>
                </span>
                <span>${t('agendamento.aviso')}</span>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="agendamento-inicio">${t('agendamento.inicio')}</label>
                    <input type="text" id="agendamento-inicio" autocomplete="off">
                </div>
                <div class="form-group">
                    <label for="agendamento-fim">${t('agendamento.devolucao_prevista')}</label>
                    <input type="text" id="agendamento-fim" autocomplete="off">
                </div>
            </div>
            <div class="modal-summary-items-list">${raw(chipsItensHtml(itens))}</div>
        </div>`;

    const inicioSelecionado = (): Date | null => pickerInicio?.selectedDates[0] ?? null;
    const fimSelecionado = (): Date | null => pickerFim?.selectedDates[0] ?? null;

    return confirmarAcao({
        titulo: t(motivo === 'futuro' ? 'agendamento.confirmar_titulo' : 'agendamento.indisponivel_titulo'),
        mensagem: '',
        rotuloConfirmar: 'emprestimo.agendar',
        variante: motivo === 'futuro' ? 'info' : 'warning',
        icone: motivo === 'futuro' ? 'event_available' : 'event_busy',
        conteudo: {
            html: conteudoHtml,
            aoAbrir: (container) => {
                inputInicio = container.querySelector<HTMLInputElement>('#agendamento-inicio');
                inputFim = container.querySelector<HTMLInputElement>('#agendamento-fim');
                let ativo = true;
                void (async () => {
                    if (!inputInicio || !inputFim) return;
                    const criadoInicio = await criarDataHoraPicker(inputInicio, {
                        defaultDate: inicioSugerido,
                        minDate: () => inicioMinimoAgendamento(agora()),
                        maxDate: () => inicioMaximoAgendamento(agora()),
                        aoMudar: (data) => {
                            if (inputInicio) limparErroCampo(inputInicio);
                            // Mantém o fim depois do início: se ficou para trás (ou vazio), reaplica a duração.
                            const fim = fimSelecionado();
                            if (data && (!fim || fim.getTime() <= data.getTime())) {
                                pickerFim?.setDate(new Date(data.getTime() + duracaoMs), false);
                            }
                        }
                    });
                    const criadoFim = await criarDataHoraPicker(inputFim, {
                        defaultDate: inicioSugerido ? new Date(inicioSugerido.getTime() + duracaoMs) : null,
                        minDate: () => inicioSelecionado() ?? undefined,
                        maxDate: () => { const i = inicioSelecionado(); return i ? new Date(i.getTime() + DURACAO_MAXIMA_AGENDAMENTO_MS) : undefined; },
                        aoMudar: () => { if (inputFim) limparErroCampo(inputFim); }
                    });
                    if (!ativo) {
                        criadoInicio.destroy();
                        criadoFim.destroy();
                        return;
                    }
                    pickerInicio = criadoInicio;
                    pickerFim = criadoFim;
                })();
                return () => {
                    ativo = false;
                    pickerInicio?.destroy();
                    pickerFim?.destroy();
                    pickerInicio = null;
                    pickerFim = null;
                };
            },
            validar: () => {
                if (!inputInicio || !inputFim) return false;
                const inicio = inicioSelecionado();
                const fim = fimSelecionado();
                const referencia = agora();
                let erroInicio = '';
                let erroFim = '';
                if (!inicio) erroInicio = t('agendamento.erro_inicio_obrigatorio');
                else if (inicio.getTime() < inicioMinimoAgendamento(referencia).getTime()) erroInicio = t('agendamento.erro_inicio_minimo');
                else if (inicio.getTime() > inicioMaximoAgendamento(referencia).getTime()) erroInicio = t('agendamento.erro_inicio_maximo');
                if (!fim) erroFim = t('agendamento.erro_fim_obrigatorio');
                else if (inicio && fim.getTime() <= inicio.getTime()) erroFim = t('agendamento.erro_fim_antes_inicio');
                else if (inicio && fim.getTime() - inicio.getTime() > DURACAO_MAXIMA_AGENDAMENTO_MS) erroFim = t('agendamento.erro_fim_muito_longo');

                limparErroCampo(inputInicio);
                limparErroCampo(inputFim);
                if (erroFim) sinalizarErroCampo(inputFim, erroFim);
                if (erroInicio) sinalizarErroCampo(inputInicio, erroInicio);
                return !erroInicio && !erroFim;
            },
            coletar: (): JanelaAgendamento => ({ inicio: inicioSelecionado() as Date, fim: fimSelecionado() as Date })
        }
    });
}

/* ===== Fluxo de registro ===== */

export type DesfechoRegistro =
    | { tipo: 'registrado'; agendado: boolean; inicio: Date }
    | { tipo: 'cancelado' }
    | { tipo: 'erro'; mensagem: string };

export interface EntradaRegistro {
    /** Rascunho; empréstimos imediatos já levam a devolução prevista (fim do dia) e nenhuma retirada. */
    dados: LoanDraft;
    /** Retirada escolhida no formulário, mais de 5 min à frente; null para retirada imediata. */
    inicioFuturo: Date | null;
}

const MAX_TENTATIVAS = 5;

function mensagemDoErro(erro: unknown): string {
    const chave = erro instanceof Error ? erro.message : null;
    return chave && !chave.includes(' ') ? t(chave) : formatarErroEstoque(erro, 'feedback.erro_registrar_emprestimo');
}

function aplicarJanela(dados: LoanDraft, janela: JanelaAgendamento): LoanDraft {
    return { ...dados, dataRetiradaISO: janela.inicio.toISOString(), dataPrevistaDevolucaoISO: janela.fim.toISOString() };
}

function interpretarSugestao(iso: unknown): Date | null {
    if (typeof iso !== 'string') return null;
    const data = new Date(iso);
    return Number.isNaN(data.getTime()) ? null : data;
}

/**
 * Conduz o registro: retirada imediata é enviada direto; retirada futura ou sem unidades agora (mas dentro da
 * capacidade) abre o modal único de agendamento e envia a janela escolhida. Se o servidor recusar por estoque com
 * `agendavel: true`, abre o mesmo modal com a sugestão dele. Acima da capacidade vira erro (toast), sem modal.
 */
export async function registrarComFluxo(
    entrada: EntradaRegistro,
    enviar: (dados: LoanDraft) => Promise<unknown>
): Promise<DesfechoRegistro> {
    let { dados } = entrada;
    const { inicioFuturo } = entrada;
    const itens = dados.itens;
    let agendado = false;
    let inicio = inicioFuturo ?? agora();

    const verificacao = inicioFuturo
        ? verificarDisponibilidade(itens, inicioFuturo, new Date(inicioFuturo.getTime() + DURACAO_PADRAO_MS), false)
        : verificarDisponibilidade(itens, agora(), dados.dataPrevistaDevolucaoISO ? new Date(dados.dataPrevistaDevolucaoISO) : new Date(agora().getTime() + DURACAO_PADRAO_MS), true);
    if (verificacao.situacao === 'alem_capacidade') {
        return { tipo: 'erro', mensagem: formatarItensEstoqueInsuficiente(verificacao.itensFaltantes) };
    }

    if (verificacao.situacao === 'insuficiente' || inicioFuturo) {
        const faltaEstoque = verificacao.situacao === 'insuficiente';
        const janela = await solicitarAgendamento(
            faltaEstoque ? 'indisponivel' : 'futuro',
            faltaEstoque ? sugerirInicio(itens, DURACAO_PADRAO_MS) : inicioFuturo,
            itens
        );
        if (!janela) return { tipo: 'cancelado' };
        dados = aplicarJanela(dados, janela);
        inicio = janela.inicio;
        agendado = true;
    }

    for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
        try {
            await enviar(dados);
            return { tipo: 'registrado', agendado, inicio };
        } catch (erro) {
            const payload = erro instanceof ApiError ? (erro.payload as Partial<PayloadEstoqueInsuficiente> | null) : null;
            if (!(payload?.agendavel === true)) return { tipo: 'erro', mensagem: mensagemDoErro(erro) };

            const janela = await solicitarAgendamento('indisponivel', interpretarSugestao(payload.proximoHorarioLivre), itens);
            if (!janela) return { tipo: 'cancelado' };
            dados = aplicarJanela(dados, janela);
            inicio = janela.inicio;
            agendado = true;
        }
    }
    return { tipo: 'erro', mensagem: t('feedback.erro_registrar_emprestimo') };
}
