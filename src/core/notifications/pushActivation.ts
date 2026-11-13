import { isAdmin } from '../auth/permissions.js';
import { pushDisponivelNoServidor } from '../api/notificacoes.js';
import { subscribe as subscribeAuth } from '../state/authStore.js';
import { t, traduzirErro } from '../state/i18nStore.js';
import { showToast } from '../ui/toast.js';
import {
    ativar,
    concluirAtivacao,
    erroDoNavegadorParaChave,
    ERRO_PERMISSAO_NEGADA,
    ERRO_PERMISSAO_SEM_RESPOSTA,
    obterEstadoPush
} from './pushNotifications.js';

/**
 * Orchestrates enabling push on this device for the Settings card and the admin banner:
 * - solicitarAtivacao(): the click path (asks for the permission and shows the feedback);
 * - a permission watcher that finishes the activation by itself when the administrator allows notifications
 *   manually in the browser UI (needed when the browser shows no permission prompt, e.g. Chrome's quiet UI).
 */

/** Dispatched on window whenever this device's push state may have changed (activation, deactivation, auto-activation). */
export const EVENTO_ESTADO_PUSH = 'eduassets:push-estado';

/** Guidance toasts are long on purpose: the user has to read them and then go to the browser UI. */
export const DURACAO_ORIENTACAO_MS = 15000;

type PermissaoNavegador = NotificationPermission | 'indisponivel';

let usuarioPediu = false;
let bannerVisivel = false;
let ocupado = false;
let orientacao: string | null = null;
let pararObservacao: (() => void) | null = null;
let sessaoObservada = false;

export function notificarEstadoPush(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(EVENTO_ESTADO_PUSH));
}

function ehErroDePermissao(erro: unknown): boolean {
    return erro instanceof Error
        && (erro.message === ERRO_PERMISSAO_NEGADA || erro.message === ERRO_PERMISSAO_SEM_RESPOSTA);
}

/**
 * Toast text for a failed activation. Raw browser failures (DOMException, e.g. "Registration failed - push service
 * error") are mapped to a translated message; i18n keys and API messages go through traduzirErro as usual.
 */
function textoDoErro(erro: unknown): string {
    const doNavegador = typeof DOMException !== 'undefined' && erro instanceof DOMException;
    return traduzirErro(doNavegador ? new Error(erroDoNavegadorParaChave(erro)) : erro, 'notif.erro_generico');
}

function lerPermissao(): PermissaoNavegador {
    return typeof Notification === 'undefined' ? 'indisponivel' : Notification.permission;
}

/** i18n key of the permission guidance left by the last failed activation (null when none). Shown in the Settings card. */
export function orientacaoDePermissao(): string | null {
    return orientacao;
}

export function ativacaoEmAndamento(): boolean {
    return ocupado;
}

/** True while the permission watcher is armed. */
export function observandoPermissao(): boolean {
    return pararObservacao !== null;
}

/**
 * Starts watching the browser permission. Idempotent. When it changes from not-granted to granted, the
 * activation is completed automatically (see aoPermissaoConcedida for the conditions).
 */
export function iniciarObservacaoDePermissao(): void {
    if (pararObservacao) return;
    const inicial = lerPermissao();
    if (inicial === 'indisponivel' || inicial === 'granted') return;

    let anterior: PermissaoNavegador = inicial;
    let encerrada = false;
    const limpezas: Array<() => void> = [];

    const verificar = (estadoInformado?: string): void => {
        if (encerrada) return;
        const atual: PermissaoNavegador = estadoInformado === 'granted' ? 'granted' : lerPermissao();
        const concedeuAgora = anterior !== 'granted' && atual === 'granted';
        anterior = atual;
        if (!concedeuAgora) return;
        pararObservacaoDePermissao();
        void aoPermissaoConcedida();
    };

    // Fallback that always works: the user comes back from the browser UI to the page.
    const aoFocar = (): void => verificar();
    const aoVisivel = (): void => {
        if (document.visibilityState === 'visible') verificar();
    };
    window.addEventListener('focus', aoFocar);
    document.addEventListener('visibilitychange', aoVisivel);
    limpezas.push(
        () => window.removeEventListener('focus', aoFocar),
        () => document.removeEventListener('visibilitychange', aoVisivel)
    );

    // Permissions API: reacts as soon as the user picks "Allow", without waiting for focus.
    try {
        const consulta = navigator.permissions?.query({ name: 'notifications' as PermissionName });
        void consulta?.then((status) => {
            if (encerrada) return;
            const aoMudar = (): void => verificar(status.state);
            status.addEventListener('change', aoMudar);
            limpezas.push(() => status.removeEventListener('change', aoMudar));
        }).catch(() => { /* query rejected (older browsers): the focus/visibility handlers cover it */ });
    } catch {
        /* Permissions API unavailable or throwing synchronously */
    }

    pararObservacao = () => {
        encerrada = true;
        limpezas.forEach((limpar) => limpar());
        pararObservacao = null;
    };
}

export function pararObservacaoDePermissao(): void {
    pararObservacao?.();
}

/**
 * Runs when the permission became 'granted' behind our back. Subscribes only when the administrator asked for
 * notifications in this page session (clicked Activate) or the banner offering them is visible, the API has
 * push, and this browser has no subscription yet: a device is never subscribed silently.
 */
async function aoPermissaoConcedida(): Promise<void> {
    if (ocupado) return;
    if (!isAdmin() || !(usuarioPediu || bannerVisivel)) return;
    ocupado = true;
    try {
        if (!(await pushDisponivelNoServidor().catch(() => false))) return;
        const estado = await obterEstadoPush();
        if (estado.suporte !== 'suportado' || estado.inscrito) return;
        if (!isAdmin()) return;
        await concluirAtivacao();
        orientacao = null;
        usuarioPediu = false;
        showToast(t('notif.ativado_automaticamente'), 'success');
    } catch (erro) {
        showToast(textoDoErro(erro), 'error');
    } finally {
        ocupado = false;
        notificarEstadoPush();
    }
}

/**
 * Click path. Must be called straight from a click handler (ativar() asks for the permission before any await).
 * Never throws; shows the feedback toast itself. Resolves true when notifications are active.
 */
export async function solicitarAtivacao(): Promise<boolean> {
    if (ocupado || !isAdmin()) return false;
    ocupado = true;
    usuarioPediu = true;
    try {
        await ativar();
        orientacao = null;
        usuarioPediu = false;
        pararObservacaoDePermissao();
        showToast(t('notif.ativadas_ok'), 'success');
        return true;
    } catch (erro) {
        if (ehErroDePermissao(erro)) {
            orientacao = (erro as Error).message;
            showToast(textoDoErro(erro), 'warning', DURACAO_ORIENTACAO_MS);
            // The user can fix it in the browser UI: finish the job when they do.
            iniciarObservacaoDePermissao();
        } else {
            showToast(textoDoErro(erro), 'error');
        }
        return false;
    } finally {
        ocupado = false;
        notificarEstadoPush();
    }
}

/** Called by the banner: while it is visible, a manual permission grant is completed automatically. */
export function definirBannerVisivel(visivel: boolean): void {
    bannerVisivel = visivel;
    if (visivel) iniciarObservacaoDePermissao();
    else if (!usuarioPediu) pararObservacaoDePermissao();
}

/** Clears the "asked for it" state after a deliberate deactivation. */
export function registrarDesativacao(): void {
    usuarioPediu = false;
    orientacao = null;
    notificarEstadoPush();
}

/** Stops everything when the session ends or the user is not an administrator. Idempotent; wired by initAtivacaoPush(). */
export function encerrarAtivacaoPush(): void {
    usuarioPediu = false;
    bannerVisivel = false;
    orientacao = null;
    pararObservacaoDePermissao();
}

export function initAtivacaoPush(): void {
    if (sessaoObservada) return;
    sessaoObservada = true;
    subscribeAuth(({ autenticado }) => {
        if (!autenticado || !isAdmin()) encerrarAtivacaoPush();
    });
}
