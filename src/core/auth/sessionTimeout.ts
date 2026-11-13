import { sair, getUsuario, getOrigemSessao, subscribe } from '../state/authStore.js';
import { fetchMe } from '../api/auth.js';
import { showToast, openModal } from '../ui/index.js';
import { setEntryRoute } from '../layout/entryRoute.js';
import { getHashRotaAtual } from '../layout/navigation.js';
import { t } from '../state/i18nStore.js';
import { setButtonLoading } from '../../shared/dom/buttonLoading.js';
import { esquecerRotaDoUsuario, salvarRotaPosLogin } from './rotaPosLogin.js';

/**
 * Client-side inactivity timeout with a warning dialog.
 *
 * - Administrators: the API ends the session after 30 min without a non-passive request
 *   (IDLE_TIMEOUT_MS in api-eduassets/backend/src/lib/adminActivity.ts). The client mirrors it from the last
 *   user activity and, while the user is active, renews the server timer with a non-passive GET /auth/me at most
 *   once per INTERVALO_RENOVACAO_SERVIDOR_MS. Passive background requests (live sync, /sync/estado) never count.
 * - Editors: no server idle limit. An optional, client-only limit can be enabled per browser in Configurações.
 * - A warning appears ANTECEDENCIA_AVISO_MS before the client limit; "Continuar conectado" sends a non-passive
 *   GET /auth/me (renews the admin timer), "Sair agora" signs out.
 * - User activity = trusted pointer (only when the position changes), keyboard, wheel and touch events (throttled).
 *   Becoming visible again only re-evaluates the deadlines. It is shared across tabs through localStorage, so
 *   activity in one tab postpones the warning in the others; expiry and explicit sign-out are broadcast too.
 *   Every shared value carries the user id and is ignored when it belongs to another user.
 * - Administrators: the deadline is based on the last server renewal that was CONFIRMED (fetchMe succeeded), so
 *   the countdown never outlasts the API session.
 */

/** Same value as IDLE_TIMEOUT_MS in the API (adminActivity.ts). */
export const LIMITE_INATIVIDADE_ADMIN_MS = 30 * 60_000;
/** The warning opens this long before the client limit (28 min for administrators). */
export const ANTECEDENCIA_AVISO_MS = 2 * 60_000;
/** User activity is recorded (and shared with other tabs) at most once per interval. */
export const INTERVALO_REGISTRO_ATIVIDADE_MS = 5_000;
/**
 * While an administrator is active, the server idle timer is renewed at most once per interval. It must stay well
 * below ANTECEDENCIA_AVISO_MS so the server never expires before the client warning appears.
 */
export const INTERVALO_RENOVACAO_SERVIDOR_MS = 60_000;
export const OPCOES_INATIVIDADE_EDITOR_MIN = [15, 30, 60] as const;
export const INATIVIDADE_EDITOR_PADRAO_MIN = 30;

export const CHAVE_ULTIMA_ATIVIDADE = 'eduassets_sessao_ultima_atividade';
export const CHAVE_ULTIMA_RENOVACAO = 'eduassets_sessao_ultima_renovacao';
export const CHAVE_EVENTO_SESSAO = 'eduassets_sessao_evento';
export const CHAVE_INATIVIDADE_EDITOR = 'eduassets_sessao_inatividade_editor';
/** Cancelable window event: the auth feature performs the full explicit sign-out and calls preventDefault(). */
export const EVENTO_SAIR_SOLICITADO = 'eduassets:sair-solicitado';

const EVENTOS_ATIVIDADE = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
const ID_MODAL = 'modal-sessao-expirando';

export interface PreferenciaInatividadeEditor {
    ativo: boolean;
    minutos: number;
}

type MotivoExpiracao = 'inatividade' | 'servidor';

interface EventoSessao {
    tipo: 'expirada' | 'logout';
    motivo?: MotivoExpiracao;
    em: number;
}

/** Shared timestamp, tied to the user that produced it. */
interface MarcaCompartilhada {
    u: number;
    t: number;
}

let iniciado = false;
let cancelarAuth: (() => void) | null = null;
let sessaoAtual: string | null = null;
let ultimaAtividade = 0;
let ultimaRenovacao = 0;
let renovando = false;
let ultimoX: number | null = null;
let ultimoY: number | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let intervaloContagem: ReturnType<typeof setInterval> | null = null;
let avisoAberto = false;
let expiracaoAviso = 0;
let continuando = false;
let focoAnterior: HTMLElement | null = null;
let preferencia: PreferenciaInatividadeEditor | null = null;
let ouvintesPreferencia: Array<(preferencia: PreferenciaInatividadeEditor) => void> = [];

// ---------------------------------------------------------------- storage (always guarded)

/** Timestamp of a shared value, or 0 when it is malformed or belongs to another user. */
function interpretarMarca(valor: string | null): number {
    if (!valor) return 0;
    try {
        const marca = JSON.parse(valor) as Partial<MarcaCompartilhada> | null;
        const usuario = getUsuario();
        if (!usuario || typeof marca !== 'object' || marca === null || marca.u !== usuario.id) return 0;
        const t = Number(marca.t);
        return Number.isFinite(t) && t > 0 ? Math.min(t, Date.now()) : 0;
    } catch {
        return 0;
    }
}

function lerMarca(chave: string): number {
    try {
        return interpretarMarca(localStorage.getItem(chave));
    } catch {
        return 0;
    }
}

function gravarMarca(chave: string, t: number): void {
    const usuario = getUsuario();
    if (usuario) gravar(chave, JSON.stringify({ u: usuario.id, t } satisfies MarcaCompartilhada));
}

function gravar(chave: string, valor: string): void {
    try {
        localStorage.setItem(chave, valor);
    } catch {
        /* storage unavailable: this tab keeps working on its own */
    }
}

function publicarEvento(evento: Omit<EventoSessao, 'em'>): void {
    // A unique payload makes every publication fire `storage` in the other tabs.
    const usuario = getUsuario();
    if (!usuario) return;
    gravar(CHAVE_EVENTO_SESSAO, JSON.stringify({ ...evento, u: usuario.id, em: Date.now(), n: Math.random() }));
}

function lerEvento(valor: string | null): EventoSessao | null {
    if (!valor) return null;
    try {
        const evento = JSON.parse(valor) as (Partial<EventoSessao> & { u?: unknown }) | null;
        if (typeof evento !== 'object' || evento === null) return null;
        // Events of another user (or without a user id) are not ours.
        if (evento.u !== getUsuario()?.id) return null;
        if (evento.tipo !== 'expirada' && evento.tipo !== 'logout') return null;
        return { tipo: evento.tipo, motivo: evento.motivo === 'servidor' ? 'servidor' : 'inatividade', em: Number(evento.em) || 0 };
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------- editor preference (per browser)

function normalizarPreferencia(valor: Partial<PreferenciaInatividadeEditor> | null | undefined): PreferenciaInatividadeEditor {
    const minutos = OPCOES_INATIVIDADE_EDITOR_MIN.includes(valor?.minutos as typeof OPCOES_INATIVIDADE_EDITOR_MIN[number])
        ? Number(valor?.minutos)
        : INATIVIDADE_EDITOR_PADRAO_MIN;
    return { ativo: valor?.ativo === true, minutos };
}

function lerPreferenciaArmazenada(): PreferenciaInatividadeEditor {
    try {
        const bruto = localStorage.getItem(CHAVE_INATIVIDADE_EDITOR);
        return normalizarPreferencia(bruto ? JSON.parse(bruto) as Partial<PreferenciaInatividadeEditor> : null);
    } catch {
        return normalizarPreferencia(null);
    }
}

/** Optional client-only inactivity limit for editors. Off by default; stored in this browser only. */
export function getPreferenciaInatividadeEditor(): PreferenciaInatividadeEditor {
    preferencia ??= lerPreferenciaArmazenada();
    return { ...preferencia };
}

export function definirPreferenciaInatividadeEditor(nova: Partial<PreferenciaInatividadeEditor>): void {
    preferencia = normalizarPreferencia({ ...getPreferenciaInatividadeEditor(), ...nova });
    gravar(CHAVE_INATIVIDADE_EDITOR, JSON.stringify(preferencia));
    // Changing the setting is user activity: the countdown starts now.
    if (getUsuario()) marcarAtividade(Date.now());
    notificarPreferencia();
    avaliar();
}

export function subscribePreferenciaInatividadeEditor(callback: (preferencia: PreferenciaInatividadeEditor) => void): () => void {
    ouvintesPreferencia.push(callback);
    return () => { ouvintesPreferencia = ouvintesPreferencia.filter((ouvinte) => ouvinte !== callback); };
}

function notificarPreferencia(): void {
    const atual = getPreferenciaInatividadeEditor();
    ouvintesPreferencia.forEach((callback) => callback(atual));
}

// ---------------------------------------------------------------- timing

/** Client limit for the signed-in user, or null when there is none. */
export function getLimiteInatividadeMs(): number | null {
    const usuario = getUsuario();
    if (!usuario) return null;
    if (usuario.nivelAcesso === 'ADMINISTRADOR') return LIMITE_INATIVIDADE_ADMIN_MS;
    const pref = getPreferenciaInatividadeEditor();
    return pref.ativo ? pref.minutos * 60_000 : null;
}

function antecedencia(limite: number): number {
    return Math.min(ANTECEDENCIA_AVISO_MS, limite / 2);
}

function sincronizarAtividadeCompartilhada(): void {
    ultimaAtividade = Math.max(ultimaAtividade, lerMarca(CHAVE_ULTIMA_ATIVIDADE));
}

function marcarAtividade(agora: number): void {
    ultimaAtividade = agora;
    gravarMarca(CHAVE_ULTIMA_ATIVIDADE, agora);
}

function confirmarRenovacao(agora: number): void {
    ultimaRenovacao = agora;
    gravarMarca(CHAVE_ULTIMA_RENOVACAO, agora);
}

/**
 * Moment the client session ends. Administrators: the API timer restarts at the last confirmed renewal, which can
 * lag behind the last activity, so the countdown must not outlast it.
 */
function calcularExpiraEm(limite: number): number {
    if (getUsuario()?.nivelAcesso !== 'ADMINISTRADOR') return ultimaAtividade + limite;
    const renovacao = Math.max(ultimaRenovacao, lerMarca(CHAVE_ULTIMA_RENOVACAO));
    return Math.min(ultimaAtividade, renovacao) + limite;
}

function limparTimer(): void {
    if (timer) clearTimeout(timer);
    timer = null;
}

/** Recomputes the state from timestamps (robust to throttled timers in background tabs) and schedules the next step. */
function avaliar(): void {
    limparTimer();
    const limite = getLimiteInatividadeMs();
    if (limite === null) {
        fecharAviso(false);
        return;
    }
    sincronizarAtividadeCompartilhada();
    const agora = Date.now();
    const expiraEm = calcularExpiraEm(limite);
    const avisoEm = expiraEm - antecedencia(limite);

    if (agora >= expiraEm) {
        expirarSessao('inatividade');
        return;
    }
    if (agora >= avisoEm) {
        abrirAviso(expiraEm);
        timer = setTimeout(avaliar, expiraEm - agora);
        return;
    }
    fecharAviso(true);
    timer = setTimeout(avaliar, avisoEm - agora);
}

function registrarAtividade(evento: Event): void {
    // Synthetic events (scripts, extensions) are never user activity.
    if (!evento.isTrusted) return;
    if (evento.type === 'pointermove') {
        // Layout shifts and still devices fire pointermove without a real movement.
        const { clientX, clientY } = evento as PointerEvent;
        if (typeof clientX !== 'number' || typeof clientY !== 'number') return;
        const igual = clientX === ultimoX && clientY === ultimoY;
        ultimoX = clientX;
        ultimoY = clientY;
        if (igual) return;
    }
    const limite = getLimiteInatividadeMs();
    if (limite === null) return;
    const agora = Date.now();
    if (agora - ultimaAtividade < INTERVALO_REGISTRO_ATIVIDADE_MS) return;

    sincronizarAtividadeCompartilhada();
    // Inside the warning window only an explicit choice ("Continuar conectado") keeps the session.
    if (avisoAberto || agora >= calcularExpiraEm(limite) - antecedencia(limite)) {
        avaliar();
        return;
    }
    marcarAtividade(agora);
    renovarServidorSeNecessario(agora);
    avaliar();
}

/** Keeps the API admin timer aligned with real user activity (passive live-sync requests do not renew it). */
function renovarServidorSeNecessario(agora: number): void {
    if (getUsuario()?.nivelAcesso !== 'ADMINISTRADOR') return;
    if (renovando) return;
    const ultima = Math.max(ultimaRenovacao, lerMarca(CHAVE_ULTIMA_RENOVACAO));
    if (agora - ultima < INTERVALO_RENOVACAO_SERVIDOR_MS) return;
    const id = getUsuario()?.id;
    renovando = true;
    // A renewal counts only once the API confirmed it. A 401 is handled by the API client
    // ("eduassets:sessao-expirada"); network errors are ignored (the deadline then stays on the last confirmation).
    fetchMe()
        .then(() => {
            if (getUsuario()?.id !== id) return;
            confirmarRenovacao(Date.now());
            avaliar();
        })
        .catch(() => undefined)
        .finally(() => { renovando = false; });
}

/** Becoming visible is NOT activity: it only re-evaluates the deadlines (timers are throttled in background tabs). */
function aoMudarVisibilidade(): void {
    if (document.visibilityState !== 'visible') return;
    avaliar();
}

// ---------------------------------------------------------------- expiry and sign-out

function expirarSessao(motivo: MotivoExpiracao, propagar = true): void {
    const usuario = getUsuario();
    if (!usuario) return;
    const porInatividade = motivo === 'inatividade' || usuario.nivelAcesso === 'ADMINISTRADOR';

    limparTimer();
    fecharAviso(false);
    salvarRotaPosLogin(getHashRotaAtual());
    if (propagar) publicarEvento({ tipo: 'expirada', motivo });
    // Only the tab where it happened revokes the session; the others just follow.
    void sair(propagar);
    showToast(t(porInatividade ? 'feedback.sessao_expirada' : 'feedback.sessao_expirada_generica'), 'warning');
    setEntryRoute('login');
    openModal('modal-login');
}

/**
 * Called by every explicit sign-out (user menu, "Sair agora") before sair(): the saved route and the router's
 * last panel are forgotten (the next user starts at Início) and the other tabs sign out too.
 */
export function registrarLogoutExplicito(): void {
    esquecerRotaDoUsuario();
    limparTimer();
    fecharAviso(false);
    if (getUsuario()) publicarEvento({ tipo: 'logout' });
}

function sairEmOutraAba(): void {
    if (!getUsuario()) return;
    esquecerRotaDoUsuario();
    limparTimer();
    fecharAviso(false);
    void sair(false);
    showToast(t('sessao.encerrada_outra_aba'), 'info');
    setEntryRoute('login');
    openModal('modal-login');
}

function aoMudarStorage(evento: StorageEvent): void {
    switch (evento.key) {
        case CHAVE_ULTIMA_ATIVIDADE: {
            // Only values written by this same user count (malformed ones are ignored).
            const valor = interpretarMarca(evento.newValue);
            if (valor > ultimaAtividade) {
                ultimaAtividade = valor;
                avaliar();
            }
            break;
        }
        case CHAVE_ULTIMA_RENOVACAO:
            // A renewal confirmed by another tab moves the administrator deadline (read from storage when evaluating).
            avaliar();
            break;
        case CHAVE_INATIVIDADE_EDITOR:
            preferencia = lerPreferenciaArmazenada();
            notificarPreferencia();
            avaliar();
            break;
        case CHAVE_EVENTO_SESSAO: {
            const recebido = lerEvento(evento.newValue);
            if (recebido?.tipo === 'expirada') expirarSessao(recebido.motivo ?? 'inatividade', false);
            else if (recebido?.tipo === 'logout') sairEmOutraAba();
            break;
        }
        default:
            break;
    }
}

// ---------------------------------------------------------------- warning dialog

interface ElementosAviso {
    overlay: HTMLElement;
    caixa: HTMLElement;
    continuar: HTMLButtonElement;
    sair: HTMLButtonElement;
    contagem: HTMLElement | null;
    erro: HTMLElement | null;
}

function elementosAviso(): ElementosAviso | null {
    const overlay = document.getElementById(ID_MODAL);
    const caixa = overlay?.querySelector<HTMLElement>('.modal-box');
    const continuar = document.getElementById('sessao-aviso-continuar') as HTMLButtonElement | null;
    const sairBtn = document.getElementById('sessao-aviso-sair') as HTMLButtonElement | null;
    if (!overlay || !caixa || !continuar || !sairBtn) return null;
    return {
        overlay,
        caixa,
        continuar,
        sair: sairBtn,
        contagem: document.getElementById('sessao-aviso-contagem'),
        erro: document.getElementById('sessao-aviso-erro'),
    };
}

export function formatarContagem(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutos = Math.floor(total / 60);
    const segundos = total % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

function atualizarContagem(): void {
    const contagem = document.getElementById('sessao-aviso-contagem');
    if (contagem) contagem.textContent = formatarContagem(expiracaoAviso - Date.now());
}

function mostrarErroAviso(mensagem: string): void {
    const erro = document.getElementById('sessao-aviso-erro');
    if (!erro) return;
    erro.textContent = mensagem;
    erro.hidden = !mensagem;
}

function abrirAviso(expiraEm: number): void {
    expiracaoAviso = expiraEm;
    atualizarContagem();
    if (avisoAberto) return;
    const els = elementosAviso();
    if (!els) return;

    avisoAberto = true;
    focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    mostrarErroAviso('');
    els.overlay.classList.add('active');
    els.continuar.focus();
    intervaloContagem = setInterval(atualizarContagem, 1000);
}

function fecharAviso(restaurarFoco: boolean): void {
    if (!avisoAberto) return;
    avisoAberto = false;
    if (intervaloContagem) clearInterval(intervaloContagem);
    intervaloContagem = null;
    const els = elementosAviso();
    els?.overlay.classList.remove('active');
    mostrarErroAviso('');
    const anterior = focoAnterior;
    focoAnterior = null;
    if (restaurarFoco && anterior?.isConnected) anterior.focus();
}

export function isAvisoSessaoAberto(): boolean {
    return avisoAberto;
}

function statusDoErro(erro: unknown): number | undefined {
    return typeof erro === 'object' && erro !== null && 'status' in erro
        ? Number((erro as { status: unknown }).status)
        : undefined;
}

/** "Continuar conectado": a non-passive GET /auth/me renews the admin timer on the API. */
export async function continuarConectado(): Promise<void> {
    if (continuando || !getUsuario()) return;
    const els = elementosAviso();
    continuando = true;
    mostrarErroAviso('');
    setButtonLoading(els?.continuar, true);
    if (els) els.sair.disabled = true;
    let manterAviso = false;
    try {
        await fetchMe();
        if (!getUsuario()) return;
        const agora = Date.now();
        marcarAtividade(agora);
        confirmarRenovacao(agora);
        fecharAviso(true);
        avaliar();
    } catch (erro) {
        if (statusDoErro(erro) === 401) {
            expirarSessao('servidor');
            return;
        }
        manterAviso = avisoAberto;
        mostrarErroAviso(t('sessao.erro_continuar'));
    } finally {
        continuando = false;
        setButtonLoading(els?.continuar, false);
        if (els) els.sair.disabled = false;
        if (manterAviso) els?.continuar.focus();
    }
}

/** "Sair agora": the auth feature performs the regular explicit sign-out (it also stops push on this device). */
export function sairAgora(): void {
    fecharAviso(false);
    const evento = new Event(EVENTO_SAIR_SOLICITADO, { cancelable: true });
    if (!window.dispatchEvent(evento)) return;
    // Nobody handled it (auth feature not loaded): minimal explicit sign-out.
    registrarLogoutExplicito();
    void sair();
    setEntryRoute('login');
    showToast(t('feedback.sessao_encerrada'), 'success');
}

function focaveisDoAviso(caixa: HTMLElement): HTMLElement[] {
    return Array.from(caixa.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((el) => !el.hidden);
}

function aoTeclarNoAviso(evento: KeyboardEvent): void {
    if (!avisoAberto) return;
    const els = elementosAviso();
    if (!els) return;
    if (evento.key === 'Escape') {
        // Escape never closes other dialogs underneath; here it means "stay signed in".
        evento.preventDefault();
        evento.stopPropagation();
        void continuarConectado();
        return;
    }
    if (evento.key !== 'Tab') return;
    const focaveis = focaveisDoAviso(els.caixa);
    evento.stopPropagation();
    if (!focaveis.length) {
        evento.preventDefault();
        return;
    }
    const primeiro = focaveis[0]!;
    const ultimo = focaveis[focaveis.length - 1]!;
    const ativo = document.activeElement as HTMLElement | null;
    const dentro = ativo ? els.caixa.contains(ativo) : false;
    if (evento.shiftKey && (ativo === primeiro || !dentro)) {
        evento.preventDefault();
        ultimo.focus();
    } else if (!evento.shiftKey && (ativo === ultimo || !dentro)) {
        evento.preventDefault();
        primeiro.focus();
    }
}

/** Keeps focus inside the dialog if something outside receives it (e.g. a programmatic focus). */
function aoFocarFora(evento: FocusEvent): void {
    if (!avisoAberto) return;
    const els = elementosAviso();
    const alvo = evento.target as Node | null;
    if (els && alvo && !els.overlay.contains(alvo)) els.continuar.focus();
}

function prepararDialogo(): void {
    const els = elementosAviso();
    if (!els || els.overlay.dataset.sessaoPronto === 'true') return;
    els.overlay.dataset.sessaoPronto = 'true';
    // initModals marks every .modal-box as role="dialog" and adds a close button: this one is an alert dialog
    // that must be answered explicitly.
    els.caixa.setAttribute('role', 'alertdialog');
    els.caixa.setAttribute('aria-modal', 'true');
    els.overlay.querySelectorAll('.modal-header > .modal-close-btn').forEach((botao) => botao.remove());
    els.continuar.addEventListener('click', () => { void continuarConectado(); });
    els.sair.addEventListener('click', sairAgora);
    els.caixa.addEventListener('keydown', aoTeclarNoAviso);
}

// ---------------------------------------------------------------- lifecycle

function aoMudarSessao(): void {
    const usuario = getUsuario();
    const chave = usuario ? `${usuario.id}:${usuario.nivelAcesso}` : null;
    if (chave !== sessaoAtual) {
        sessaoAtual = chave;
        if (chave) {
            const agora = Date.now();
            const limite = getLimiteInatividadeMs();
            const armazenada = lerMarca(CHAVE_ULTIMA_ATIVIDADE);
            // A session restored on page load must not escape the inactivity limit by reloading the page.
            if (getOrigemSessao() === 'restaurada' && limite !== null && armazenada > 0 && agora - armazenada >= limite) {
                expirarSessao('inatividade');
                return;
            }
            // A new session starts now (sign-in, restored session on load): it is activity and a confirmed server
            // renewal (the sign-in / session restore request itself).
            marcarAtividade(agora);
            confirmarRenovacao(agora);
        }
    }
    avaliar();
}

export function initSessionTimeout(): void {
    if (iniciado) return;
    iniciado = true;
    prepararDialogo();
    EVENTOS_ATIVIDADE.forEach((evento) => document.addEventListener(evento, registrarAtividade, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    document.addEventListener('focusin', aoFocarFora);
    window.addEventListener('storage', aoMudarStorage);
    window.addEventListener('eduassets:sessao-expirada', aoSessaoExpiradaNoServidor);
    cancelarAuth = subscribe(aoMudarSessao);
    aoMudarSessao();
}

function aoSessaoExpiradaNoServidor(): void {
    expirarSessao('servidor');
}

/** Test helper: removes listeners and forgets every state. */
export function __resetSessionTimeoutForTests(): void {
    EVENTOS_ATIVIDADE.forEach((evento) => document.removeEventListener(evento, registrarAtividade, { capture: true }));
    document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    document.removeEventListener('focusin', aoFocarFora);
    window.removeEventListener('storage', aoMudarStorage);
    window.removeEventListener('eduassets:sessao-expirada', aoSessaoExpiradaNoServidor);
    cancelarAuth?.();
    cancelarAuth = null;
    limparTimer();
    if (intervaloContagem) clearInterval(intervaloContagem);
    intervaloContagem = null;
    iniciado = false;
    sessaoAtual = null;
    ultimaAtividade = 0;
    ultimaRenovacao = 0;
    renovando = false;
    ultimoX = null;
    ultimoY = null;
    avisoAberto = false;
    expiracaoAviso = 0;
    continuando = false;
    focoAnterior = null;
    preferencia = null;
    ouvintesPreferencia = [];
}
