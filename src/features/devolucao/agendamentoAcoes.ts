import { confirmarAcao, showToast } from '../../core/ui/index.js';
import { confirmarRetirada, excluirAgendamento } from '../../core/state/loanStore.js';
import { atualizarAgora } from '../../core/state/liveSync.js';
import { t, traduzirErro, formatarDataHora } from '../../core/state/i18nStore.js';
import { ApiError } from '../../core/api/apiClient.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';
import { html, raw } from '../../core/utils/html.js';
import { estadoAgendamento, formatarJanela } from './agendamento.js';
import type { EmprestimoPendenteDevolucao, LoanUI } from '../../types/index.js';

const ERRO_UNIDADES_NAO_DEVOLVIDAS = 'backend.emprestimos.unidades_nao_devolvidas';

function linhaResumo(icone: string, texto: string): string {
    return html`
        <span class="modal-summary-row">
            <span class="icon-badge icon-badge--sm icon-badge--neutral">
                <span class="material-symbols-outlined" aria-hidden="true">${icone}</span>
            </span>
            <span>${texto}</span>
        </span>`;
}

/** Resumo do agendamento (solicitante, janela e itens) para os modais de confirmação. */
export function resumoAgendamentoHtml(loan: LoanUI): string {
    const estado = estadoAgendamento(loan);
    const itens = loan.itens.map((item) => html`
        <span class="modal-summary-item">
            <span class="material-symbols-outlined" aria-hidden="true">inventory_2</span>
            <span class="modal-summary-item-text">${item.quantidade}x ${item.nome}</span>
        </span>`).join('');
    return html`
        <div class="modal-summary-panel">
            ${raw(linhaResumo('person', `${loan.aluno} · ${loan.responsavel}`))}
            ${raw(linhaResumo('event', formatarJanela(estado.inicio, estado.fim)))}
            <div class="modal-summary-items">
                <span class="modal-summary-label">${t('agendamento.itens')}</span>
                <div class="modal-summary-items-list">${raw(itens)}</div>
            </div>
        </div>`;
}

function ehErroUnidadesNaoDevolvidas(erro: unknown): erro is ApiError {
    return erro instanceof ApiError && erro.status === 409 && erro.payload?.erro === ERRO_UNIDADES_NAO_DEVOLVIDAS;
}

function pendentesHtml(pendentes: EmprestimoPendenteDevolucao[]): string {
    const linhas = pendentes.map((p) => linhaResumo(
        'assignment_late',
        t('devolucao.pendente_item')
            .replace('{solicitante}', p.solicitanteNome)
            .replace('{data}', formatarDataHora(p.dataPrevistaDevolucao) || '—')
    )).join('');
    return html`<div class="modal-summary-panel">${raw(linhas)}</div>`;
}

/** Empréstimos que ainda seguram as unidades deste agendamento (409): lista quem precisa devolver. */
export async function mostrarPendentesDevolucao(pendentes: EmprestimoPendenteDevolucao[]): Promise<void> {
    await confirmarAcao({
        titulo: t(ERRO_UNIDADES_NAO_DEVOLVIDAS),
        mensagem: t('devolucao.pendentes_titulo'),
        detalhesHtml: pendentes.length ? pendentesHtml(pendentes) : undefined,
        rotuloConfirmar: 'controle.entendi',
        variante: 'error',
        icone: 'assignment_late'
    });
}

/** Confirma a retirada de um agendamento (modal informativo; trata o 409 de unidades ainda não devolvidas). */
export async function confirmarRetiradaAgendamento(loan: LoanUI): Promise<boolean> {
    if (bloquearSeConvidado()) return false;
    if (!estadoAgendamento(loan).podeConfirmar) return false;

    const confirmado = await confirmarAcao({
        titulo: t('devolucao.confirmar_retirada_titulo'),
        mensagem: t('devolucao.confirmar_retirada_mensagem'),
        detalhesHtml: resumoAgendamentoHtml(loan),
        rotuloConfirmar: 'devolucao.confirmar_retirada',
        variante: 'info',
        icone: 'how_to_reg'
    });
    if (!confirmado) return false;

    try {
        await confirmarRetirada(loan.id);
        showToast(t('feedback.retirada_confirmada'), 'success');
        return true;
    } catch (erro) {
        if (ehErroUnidadesNaoDevolvidas(erro)) {
            const pendentes = erro.payload?.emprestimosPendentes;
            await mostrarPendentesDevolucao(Array.isArray(pendentes) ? pendentes as EmprestimoPendenteDevolucao[] : []);
        } else {
            showToast(traduzirErro(erro, 'feedback.erro_confirmar_retirada'), 'error');
        }
        // Outra pessoa pode ter confirmado/excluído antes: atualiza a lista em vez de esperar o próximo ciclo.
        void atualizarAgora();
        return false;
    }
}

/** Exclui um agendamento (ex.: quem não compareceu), depois de confirmar. */
export async function excluirAgendamentoComConfirmacao(loan: LoanUI): Promise<boolean> {
    if (bloquearSeConvidado()) return false;

    const confirmado = await confirmarAcao({
        titulo: t('devolucao.excluir_agendamento_titulo'),
        mensagem: t('devolucao.excluir_agendamento_mensagem'),
        detalhesHtml: resumoAgendamentoHtml(loan),
        rotuloConfirmar: 'devolucao.excluir_agendamento',
        variante: 'error',
        icone: 'event_busy'
    });
    if (!confirmado) return false;

    try {
        await excluirAgendamento(loan.id);
        showToast(t('feedback.agendamento_excluido'), 'success');
        return true;
    } catch (erro) {
        showToast(traduzirErro(erro, 'feedback.erro_excluir_agendamento'), 'error');
        void atualizarAgora();
        return false;
    }
}
