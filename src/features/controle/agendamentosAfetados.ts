import { confirmarAcao } from '../../core/ui/index.js';
import { t, formatarDataHora } from '../../core/state/i18nStore.js';
import { html, raw } from '../../core/utils/html.js';
import type { AgendamentoAfetado } from '../../types/index.js';

function formatarHoraFim(inicio: string, fim: string | null): string {
    if (!fim) return '—';
    const a = new Date(inicio);
    const b = new Date(fim);
    // Mesmo dia: só a hora no fim ("25/11/2026 09:00 – 10:00").
    if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime()) && a.toDateString() === b.toDateString()) {
        return b.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return formatarDataHora(fim);
}

export function renderAgendamentosAfetados(afetados: AgendamentoAfetado[]): string {
    const linhas = afetados.map((a) => html`
        <span class="modal-summary-row">
            <span class="icon-badge icon-badge--sm icon-badge--neutral">
                <span class="material-symbols-outlined" aria-hidden="true">event_busy</span>
            </span>
            <span>${t('controle.agendamento_afetado_item')
                .replace('{solicitante}', a.solicitanteNome)
                .replace('{inicio}', formatarDataHora(a.dataAgendada))
                .replace('{fim}', formatarHoraFim(a.dataAgendada, a.dataPrevistaDevolucao))}</span>
        </span>`).join('');
    return html`<div class="modal-summary-panel">${raw(linhas)}</div>`;
}

/**
 * Depois de criar uma ocorrência (manutenção/quebrado) que deixou agendamentos sem unidades suficientes, avisa quais
 * são. Modal de aviso (e não toast) porque a lista pode ter vários agendamentos e precisa ser lida com calma.
 * Sem agendamentos afetados não faz nada.
 */
export async function avisarAgendamentosAfetados(afetados: AgendamentoAfetado[]): Promise<void> {
    if (!afetados.length) return;
    await confirmarAcao({
        titulo: t('controle.agendamentos_afetados_titulo'),
        mensagem: t(afetados.length === 1 ? 'controle.agendamentos_afetados_um' : 'controle.agendamentos_afetados_varios')
            .replace('{n}', String(afetados.length)),
        detalhesHtml: renderAgendamentosAfetados(afetados),
        textoAtencao: t('controle.agendamentos_afetados_mensagem'),
        rotuloConfirmar: 'controle.entendi',
        variante: 'warning',
        icone: 'event_busy'
    });
}
