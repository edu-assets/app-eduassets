import { ApiError } from '../../core/api/index.js';
import { confirmarAcao } from '../../core/ui/confirm.js';
import { criarDataHoraPicker, type FlatpickrInstance } from '../../core/ui/datepicker.js';
import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { capacidade, livreNoIntervalo, proximoHorarioLivre } from '../../core/state/disponibilidade.js';
import { formatarDataHora, t } from '../../core/state/i18nStore.js';
import { agora } from '../../core/time/serverClock.js';
import { DURACAO_MAXIMA_AGENDAMENTO_MS, inicioMaximoAgendamento, inicioMinimoAgendamento, type ItemDisponibilidade } from '../../core/utils/estoque.js';
import { formatarErroEstoque, formatarItensEstoqueInsuficiente } from '../../core/utils/erroEstoque.js';
import { html, raw } from '../../core/utils/html.js';
import { limparErroCampo, sinalizarErroCampo } from '../../shared/forms/fieldErrors.js';
import type { ItemEstoqueInsuficiente, LoanDraft, LoanItemUI, PayloadEstoqueInsuficiente } from '../../types/index.js';

/**
 * Fluxo de agendamento do formulário de empréstimo: verificação de disponibilidade no cliente, os dois modais
 * ("Gostaria de agendar...?" e "O número solicitado não está disponível...") e o reenvio quando o servidor recusa
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

/* ===== Modais ===== */

/** Linha do resumo (mesmo padrão do modal de confirmar devolução: ícone neutro + texto). */
function linhaResumoHtml(icone: string, texto: string): string {
    return html`
        <span class="modal-summary-row">
            <span class="icon-badge icon-badge--sm icon-badge--neutral">
                <span class="material-symbols-outlined" aria-hidden="true">${icone}</span>
            </span>
            <span>${texto}</span>
        </span>`;
}

function chipsItensHtml(itens: LoanItemUI[]): string {
    return itens.map((item) => html`
        <span class="modal-summary-item">
            <span class="material-symbols-outlined" aria-hidden="true">inventory_2</span>
            <span class="modal-summary-item-text">${item.quantidade}x ${item.nome}</span>
        </span>`).join('');
}

/** Modal 1: "Gostaria de agendar o uso desses equipamentos?" — mostra a janela e os itens. */
export function confirmarAgendamento(janela: JanelaAgendamento, itens: LoanItemUI[]): Promise<boolean> {
    const detalhesHtml = html`
        <div class="modal-summary-panel">
            <span class="modal-summary-label">${t('agendamento.periodo')}</span>
            ${raw(linhaResumoHtml('schedule', `${t('agendamento.retirada')}: ${formatarDataHora(janela.inicio)}`))}
            ${raw(linhaResumoHtml('event_available', `${t('agendamento.devolucao_prevista')}: ${formatarDataHora(janela.fim)}`))}
            <div class="modal-summary-items">
                <span class="modal-summary-label">${t('agendamento.itens')}</span>
                <div class="modal-summary-items-list">${raw(chipsItensHtml(itens))}</div>
            </div>
        </div>`;
    return confirmarAcao({
        titulo: t('agendamento.confirmar_titulo'),
        mensagem: t('agendamento.confirmar_mensagem'),
        detalhesHtml,
        rotuloConfirmar: 'agendamento.sim',
        rotuloCancelar: 'agendamento.nao',
        variante: 'info',
        icone: 'event_available'
    });
}

/**
 * Modal 2: "O número de equipamentos solicitado não está disponível. Gostaria de realizar um agendamento?" com início
 * e fim (a sugestão preenche os campos; sem sugestão ficam vazios). Resolve a janela escolhida ou null ao cancelar.
 */
export function solicitarNovaJanela(sugestao: { inicio: Date | null; fim: Date | null }, duracaoMs: number = DURACAO_PADRAO_MS): Promise<JanelaAgendamento | null> {
    let pickerInicio: FlatpickrInstance | null = null;
    let pickerFim: FlatpickrInstance | null = null;
    let inputInicio: HTMLInputElement | null = null;
    let inputFim: HTMLInputElement | null = null;

    const conteudoHtml = html`
        <div class="modal-fields">
            <div class="form-row">
                <div class="form-group">
                    <label for="agendamento-inicio">${t('agendamento.inicio')}</label>
                    <input type="text" id="agendamento-inicio" autocomplete="off">
                </div>
                <div class="form-group">
                    <label for="agendamento-fim">${t('agendamento.fim')}</label>
                    <input type="text" id="agendamento-fim" autocomplete="off">
                </div>
            </div>
            <div class="modal-callout modal-callout-info">
                <span class="icon-badge icon-badge--sm icon-badge--info">
                    <span class="material-symbols-outlined" aria-hidden="true">info</span>
                </span>
                <span id="agendamento-sugestao">${sugestao.inicio ? t('agendamento.sugestao') : t('agendamento.sem_sugestao')}</span>
            </div>
        </div>`;

    const inicioSelecionado = (): Date | null => pickerInicio?.selectedDates[0] ?? null;
    const fimSelecionado = (): Date | null => pickerFim?.selectedDates[0] ?? null;

    return confirmarAcao({
        titulo: t('agendamento.indisponivel_titulo'),
        mensagem: t('agendamento.indisponivel_mensagem'),
        rotuloConfirmar: 'agendamento.sim',
        rotuloCancelar: 'agendamento.nao',
        variante: 'warning',
        icone: 'event_busy',
        conteudo: {
            html: conteudoHtml,
            aoAbrir: (container) => {
                inputInicio = container.querySelector<HTMLInputElement>('#agendamento-inicio');
                inputFim = container.querySelector<HTMLInputElement>('#agendamento-fim');
                let ativo = true;
                void (async () => {
                    if (!inputInicio || !inputFim) return;
                    const criadoInicio = await criarDataHoraPicker(inputInicio, {
                        defaultDate: sugestao.inicio,
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
                        defaultDate: sugestao.inicio ? (sugestao.fim ?? new Date(sugestao.inicio.getTime() + duracaoMs)) : null,
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
    dados: LoanDraft;
    /** Início efetivo: a retirada escolhida ou agora. */
    inicio: Date;
    /** Devolução prevista. */
    fim: Date;
    /** true quando a retirada escolhida está a mais de 5 min no futuro. */
    agendando: boolean;
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
 * Conduz o registro: checa a disponibilidade, abre o modal 1 (agendamento futuro) ou o modal 2 (sem unidades, mas
 * dentro da capacidade) e envia. Se o servidor recusar por estoque com `agendavel: true`, abre o modal 2 com a
 * sugestão dele. Acima da capacidade vira erro (toast), sem modal.
 */
export async function registrarComFluxo(
    entrada: EntradaRegistro,
    enviar: (dados: LoanDraft) => Promise<unknown>
): Promise<DesfechoRegistro> {
    let { dados, inicio, fim, agendando } = entrada;
    const itens = dados.itens;
    const duracao = Math.max(60_000, fim.getTime() - inicio.getTime());

    const verificacao = verificarDisponibilidade(itens, agendando ? inicio : agora(), fim, !agendando);
    if (verificacao.situacao === 'alem_capacidade') {
        return { tipo: 'erro', mensagem: formatarItensEstoqueInsuficiente(verificacao.itensFaltantes) };
    }

    if (verificacao.situacao === 'insuficiente') {
        const sugerido = sugerirInicio(itens, duracao);
        const janela = await solicitarNovaJanela({ inicio: sugerido, fim: sugerido ? new Date(sugerido.getTime() + duracao) : null }, duracao);
        if (!janela) return { tipo: 'cancelado' };
        dados = aplicarJanela(dados, janela);
        ({ inicio, fim } = janela);
        agendando = true;
    } else if (agendando && !(await confirmarAgendamento({ inicio, fim }, itens))) {
        return { tipo: 'cancelado' };
    }

    for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
        try {
            await enviar(dados);
            return { tipo: 'registrado', agendado: agendando, inicio };
        } catch (erro) {
            const payload = erro instanceof ApiError ? (erro.payload as Partial<PayloadEstoqueInsuficiente> | null) : null;
            if (!(payload?.agendavel === true)) return { tipo: 'erro', mensagem: mensagemDoErro(erro) };

            const sugerido = interpretarSugestao(payload.proximoHorarioLivre);
            const janela = await solicitarNovaJanela({ inicio: sugerido, fim: sugerido ? new Date(sugerido.getTime() + duracao) : null }, duracao);
            if (!janela) return { tipo: 'cancelado' };
            dados = aplicarJanela(dados, janela);
            ({ inicio, fim } = janela);
            agendando = true;
        }
    }
    return { tipo: 'erro', mensagem: t('feedback.erro_registrar_emprestimo') };
}
