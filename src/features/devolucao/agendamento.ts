import { agora } from '../../core/time/serverClock.js';
import { getLocale } from '../../core/state/i18nStore.js';
import type { LoanUI } from '../../types/index.js';

/** A retirada pode ser confirmada a partir de 30 min antes do início, até o fim da janela agendada. */
export const ANTECEDENCIA_CONFIRMACAO_MS = 30 * 60_000;

export type SituacaoAgendamento = 'expirado' | 'atrasado' | 'hoje' | 'agendado';

export interface EstadoAgendamento {
    situacao: SituacaoAgendamento;
    inicio: Date;
    fim: Date | null;
    /** Dentro da janela de confirmação (30 min antes do início até o fim). */
    podeConfirmar: boolean;
    /** Instante em que a confirmação passa a ser permitida. */
    liberaEm: Date;
}

function dataValida(valor: string | null | undefined): Date | null {
    if (!valor) return null;
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
}

/**
 * Situação do agendamento em `agora`:
 * - expirado: a janela terminou (agora ≥ fim);
 * - atrasado: já passou do início e a retirada não foi confirmada;
 * - hoje: o início é hoje (dia local) e ainda não chegou;
 * - agendado: início em outro dia.
 */
export function estadoAgendamento(loan: LoanUI, referencia: Date = agora()): EstadoAgendamento {
    const inicio = dataValida(loan.dataAgendada) ?? dataValida(loan.data) ?? new Date(NaN);
    const fim = dataValida(loan.dataPrevistaDevolucao);
    const agoraMs = referencia.getTime();
    const liberaEm = new Date(inicio.getTime() - ANTECEDENCIA_CONFIRMACAO_MS);

    let situacao: SituacaoAgendamento;
    if (fim && agoraMs >= fim.getTime()) situacao = 'expirado';
    else if (agoraMs > inicio.getTime()) situacao = 'atrasado';
    else if (inicio.toDateString() === referencia.toDateString()) situacao = 'hoje';
    else situacao = 'agendado';

    const podeConfirmar = situacao !== 'expirado' && agoraMs >= liberaEm.getTime();
    return { situacao, inicio, fim, podeConfirmar, liberaEm };
}

export function formatarHoraCurta(data: Date): string {
    return data.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
}

function formatarDataCurta(data: Date): string {
    return data.toLocaleDateString(getLocale(), { day: '2-digit', month: '2-digit' });
}

/** "25/11 09:00 – 10:00" (mesmo dia) ou "25/11 09:00 – 26/11 10:00". Sem fim, só o início. */
export function formatarJanela(inicio: Date, fim: Date | null): string {
    if (Number.isNaN(inicio.getTime())) return '';
    const comeco = `${formatarDataCurta(inicio)} ${formatarHoraCurta(inicio)}`;
    if (!fim || Number.isNaN(fim.getTime())) return comeco;
    const mesmoDia = inicio.toDateString() === fim.toDateString();
    return `${comeco} – ${mesmoDia ? '' : `${formatarDataCurta(fim)} `}${formatarHoraCurta(fim)}`;
}

/** Hora (mesmo dia de `referencia`) ou "dd/mm hora" (outro dia). */
export function formatarInstante(data: Date, referencia: Date = agora()): string {
    const hora = formatarHoraCurta(data);
    return data.toDateString() === referencia.toDateString() ? hora : `${formatarDataCurta(data)} ${hora}`;
}
