import {
    enviarNotificacaoTeste,
    obterConfigPush,
    removerInscricaoPush,
    salvarInscricaoPush
} from '../api/notificacoes.js';
import type { PushInscricaoJson, PushPreferencias } from '../api/notificacoes.js';
import { detectarSuportePush, lerAmbientePush } from './pushSupport.js';
import type { SuportePush } from './pushSupport.js';

const SW_URL = '/sw.js';
const PREFS_STORAGE_KEY = 'eduassets_push_prefs';
const PREFS_PADRAO: PushPreferencias = { emprestimo: true, devolucao: true, ocorrencia: true };

/** Errors carry i18n keys as message (no spaces), resolved by traduzirErro(). */
export const ERRO_PUSH_INDISPONIVEL = 'notif.erro_indisponivel';
export const ERRO_PERMISSAO_NEGADA = 'notif.erro_permissao';
/** The browser resolved the permission request as 'default': no popup was shown (quiet UI) or it was dismissed. */
export const ERRO_PERMISSAO_SEM_RESPOSTA = 'notif.erro_permissao_sem_resposta';
export const ERRO_NAO_SUPORTADO = 'notif.erro_nao_suportado';
/** PushManager.subscribe() failed in the browser's push service (AbortError "Registration failed - push service error", etc.). */
export const ERRO_SERVICO_PUSH = 'notif.erro_servico_push';
/** The browser rejected the server's VAPID public key (InvalidAccessError) or it could not be decoded. */
export const ERRO_CHAVE_PUSH = 'notif.erro_chave_push';

/** Cross-tab lock name (Web Locks API): two tabs/PWA windows must never call subscribe() at the same time. */
const TRAVA_INSCRICAO = 'eduassets-push-inscricao';
/** Pause before the single retry of a failed subscribe() (stale subscription removed in between). */
export const ESPERA_NOVA_TENTATIVA_MS = 1500;
/** A permission request whose promise never settles (seen on some mobile browsers) stops blocking after this. */
export const LIMITE_PEDIDO_PERMISSAO_MS = 60000;
const INTERVALO_VERIFICACAO_PERMISSAO_MS = 500;
const LIMITE_TRAVA_MS = 20000;
const LIMITE_ESPERA_ESTADO_MS = 10000;
/**
 * A whole activation (service worker ready + subscribe + server registration) that takes longer than this fails with
 * ERRO_SERVICO_PUSH: some browsers never settle subscribe(), which would otherwise hold the cross-tab lock and the
 * single-flight promise forever (button stuck loading, every later attempt sharing the hung run).
 */
export const LIMITE_ATIVACAO_MS = 45000;
/** DOMException names of subscribe() worth one retry: stale/broken registration or a transient push service failure. */
const ERROS_TRANSITORIOS = new Set(['AbortError', 'InvalidStateError', 'NetworkError', 'UnknownError', 'TimeoutError']);

/** Converts a base64url VAPID public key into the bytes expected by PushManager.subscribe(). */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
    const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    return bytes;
}

function ehBoolean(valor: unknown): valor is boolean {
    return typeof valor === 'boolean';
}

export function normalizarPreferencias(valor: unknown): PushPreferencias {
    const origem = (typeof valor === 'object' && valor !== null ? valor : {}) as Partial<Record<keyof PushPreferencias, unknown>>;
    return {
        emprestimo: ehBoolean(origem.emprestimo) ? origem.emprestimo : PREFS_PADRAO.emprestimo,
        devolucao: ehBoolean(origem.devolucao) ? origem.devolucao : PREFS_PADRAO.devolucao,
        ocorrencia: ehBoolean(origem.ocorrencia) ? origem.ocorrencia : PREFS_PADRAO.ocorrencia
    };
}

/** Last preferences applied on this device (the API has no read endpoint; PUT returns them). */
export function lerPreferenciasLocais(): PushPreferencias {
    try {
        const bruto = localStorage.getItem(PREFS_STORAGE_KEY);
        return normalizarPreferencias(bruto ? JSON.parse(bruto) : null);
    } catch {
        return { ...PREFS_PADRAO };
    }
}

function salvarPreferenciasLocais(prefs: PushPreferencias): void {
    try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        /* storage unavailable: defaults apply on the next sync */
    }
}

export function suportePush(): SuportePush {
    return detectarSuportePush(lerAmbientePush());
}

let registroPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/** Registers the service worker once. Resolves null when unsupported or registration fails. */
export function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    if (!registroPromise) {
        registroPromise = navigator.serviceWorker
            .register(SW_URL, { scope: '/' })
            .catch((erro) => {
                console.error('[eduAssets] Service worker registration failed:', erro);
                registroPromise = null;
                return null;
            });
    }
    return registroPromise;
}

async function obterRegistro(): Promise<ServiceWorkerRegistration | null> {
    const registro = await registrarServiceWorker();
    if (!registro) return null;
    try {
        return await navigator.serviceWorker.ready;
    } catch {
        return registro;
    }
}

async function obterInscricaoLocal(): Promise<PushSubscription | null> {
    const suporte = suportePush();
    if (suporte === 'nao_suportado' || suporte === 'ios_instalar') return null;
    const registro = await obterRegistro();
    return registro ? registro.pushManager.getSubscription() : null;
}

function paraJson(inscricao: PushSubscription): PushInscricaoJson | null {
    const json = inscricao.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!json.endpoint || !p256dh || !auth) return null;
    return { endpoint: json.endpoint, keys: { p256dh, auth } };
}

export interface EstadoPush {
    suporte: SuportePush;
    /** This browser holds a push subscription. */
    inscrito: boolean;
    preferencias: PushPreferencias;
}

export async function obterEstadoPush(): Promise<EstadoPush> {
    // Never touch the PushManager while a subscription is being created (and report the state after it).
    if (ativacaoEmCurso) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
            ativacaoEmCurso.catch(() => undefined),
            new Promise<void>((resolve) => { timer = setTimeout(resolve, LIMITE_ESPERA_ESTADO_MS); })
        ]);
        clearTimeout(timer);
    }
    const suporte = suportePush();
    let inscrito = false;
    if (suporte === 'suportado') {
        try {
            inscrito = (await obterInscricaoLocal()) !== null;
        } catch {
            inscrito = false;
        }
    }
    return { suporte, inscrito, preferencias: lerPreferenciasLocais() };
}

function mesmaChave(inscricao: PushSubscription, chave: Uint8Array): boolean {
    const atual = inscricao.options?.applicationServerKey;
    if (!atual) return true;
    const bytes = new Uint8Array(atual);
    return bytes.length === chave.length && bytes.every((valor, indice) => valor === chave[indice]);
}

function nomeDoErro(erro: unknown): string {
    return typeof erro === 'object' && erro !== null && typeof (erro as { name?: unknown }).name === 'string'
        ? (erro as { name: string }).name
        : '';
}

/**
 * Maps a browser failure of the Push API (DOMException) to an i18n key, so the user never sees raw messages
 * such as "Registration failed - push service error".
 */
export function erroDoNavegadorParaChave(erro: unknown): string {
    switch (nomeDoErro(erro)) {
        case 'NotAllowedError': {
            const permissao = typeof Notification === 'undefined' ? 'default' : Notification.permission;
            if (permissao === 'denied') return ERRO_PERMISSAO_NEGADA;
            return permissao === 'granted' ? ERRO_SERVICO_PUSH : ERRO_PERMISSAO_SEM_RESPOSTA;
        }
        case 'InvalidAccessError':
        case 'InvalidCharacterError':
            return ERRO_CHAVE_PUSH;
        case 'NotSupportedError':
        case 'SecurityError':
            return ERRO_NAO_SUPORTADO;
        default:
            return ERRO_SERVICO_PUSH;
    }
}

const esperar = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * subscribe() with one recovery attempt. "push service error" (AbortError) and InvalidStateError usually come from
 * a stale/broken subscription left in the browser or a transient push service failure: drop whatever subscription
 * exists, wait a moment and try once more. Never loops.
 */
async function inscreverComRecuperacao(registro: ServiceWorkerRegistration, chave: Uint8Array<ArrayBuffer>): Promise<PushSubscription> {
    const opcoes: PushSubscriptionOptionsInit = { userVisibleOnly: true, applicationServerKey: chave };
    try {
        return await registro.pushManager.subscribe(opcoes);
    } catch (erro) {
        if (!ERROS_TRANSITORIOS.has(nomeDoErro(erro))) throw new Error(erroDoNavegadorParaChave(erro));
        console.warn('[eduAssets] Push subscribe failed, retrying once:', nomeDoErro(erro));
    }
    try {
        const restante = await registro.pushManager.getSubscription();
        if (restante) await restante.unsubscribe();
    } catch {
        /* nothing to clean up, or the browser refused: the retry below decides */
    }
    await esperar(ESPERA_NOVA_TENTATIVA_MS);
    try {
        return await registro.pushManager.subscribe(opcoes);
    } catch (erro) {
        console.error('[eduAssets] Push subscribe failed:', erro);
        throw new Error(erroDoNavegadorParaChave(erro));
    }
}

let ativacaoEmCurso: Promise<PushPreferencias> | null = null;

function comLimiteDeTempo<T>(tarefa: Promise<T>, limiteMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<never>((_, rejeitar) => {
        timer = setTimeout(() => rejeitar(new Error(ERRO_SERVICO_PUSH)), limiteMs);
    });
    return Promise.race([tarefa, limite]).finally(() => clearTimeout(timer));
}

/** Runs the task holding a lock shared by every tab/window of the app (when the Web Locks API exists). */
function comTravaEntreAbas<T>(tarefa: () => Promise<T>): Promise<T> {
    const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
    if (!locks || typeof locks.request !== 'function') return tarefa();
    // Never wait forever for another tab: after the limit, go ahead without the lock.
    const sinal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(LIMITE_TRAVA_MS)
        : undefined;
    let iniciou = false;
    const comTrava = locks.request(TRAVA_INSCRICAO, sinal ? { signal: sinal } : {}, () => {
        iniciou = true;
        return tarefa();
    }) as Promise<T>;
    return comTrava.catch((erro: unknown) => {
        if (iniciou) throw erro;
        return tarefa();
    });
}

/**
 * Subscribes this browser to push and registers the subscription on the server. Requires the notification
 * permission to be granted already (no prompt is shown here), so it also serves the automatic activation
 * that runs after the user allows notifications manually in the browser UI.
 *
 * Single flight: concurrent callers (click, permission watcher, Settings card, other tabs through the Web Lock)
 * share one run, because a second subscribe() while one is pending fails with "push service error".
 */
export function concluirAtivacao(): Promise<PushPreferencias> {
    if (!ativacaoEmCurso) {
        ativacaoEmCurso = comTravaEntreAbas(() => comLimiteDeTempo(executarAtivacao(), LIMITE_ATIVACAO_MS))
            .finally(() => { ativacaoEmCurso = null; });
    }
    return ativacaoEmCurso;
}

async function executarAtivacao(): Promise<PushPreferencias> {
    if (suportePush() !== 'suportado') throw new Error(ERRO_NAO_SUPORTADO);
    if (Notification.permission !== 'granted') throw new Error(ERRO_PERMISSAO_NEGADA);

    const config = await obterConfigPush();
    if (!config.habilitado || !config.chavePublica) throw new Error(ERRO_PUSH_INDISPONIVEL);

    const registro = await obterRegistro();
    if (!registro) throw new Error(ERRO_NAO_SUPORTADO);

    let chave: Uint8Array<ArrayBuffer>;
    try {
        chave = urlBase64ToUint8Array(config.chavePublica);
    } catch {
        throw new Error(ERRO_CHAVE_PUSH);
    }
    if (chave.length !== 65 || chave[0] !== 4) throw new Error(ERRO_CHAVE_PUSH);

    let inscricao: PushSubscription | null;
    try {
        inscricao = await registro.pushManager.getSubscription();
        if (inscricao && !mesmaChave(inscricao, chave)) {
            // Subscription made with another VAPID key (keys were rotated): it can never receive pushes again,
            // and subscribe() with the new key fails (InvalidStateError) while it exists.
            await inscricao.unsubscribe();
            inscricao = null;
        }
    } catch (erro) {
        throw new Error(erroDoNavegadorParaChave(erro));
    }
    let criadaAgora = false;
    if (!inscricao) {
        inscricao = await inscreverComRecuperacao(registro, chave);
        criadaAgora = true;
    }

    const dados = paraJson(inscricao);
    if (!dados) {
        await inscricao.unsubscribe().catch(() => false);
        throw new Error(ERRO_NAO_SUPORTADO);
    }

    const preferencias = lerPreferenciasLocais();
    try {
        const resposta = await salvarInscricaoPush(dados, preferencias);
        const efetivas = normalizarPreferencias(resposta?.preferencias ?? preferencias);
        salvarPreferenciasLocais(efetivas);
        return efetivas;
    } catch (erro) {
        // Do not leave a browser subscription the server does not know about.
        if (criadaAgora) await inscricao.unsubscribe().catch(() => false);
        throw erro;
    }
}

/**
 * Notification.requestPermission() made robust across browsers. Must run synchronously inside the click (user
 * gesture): the request is issued in the Promise executor, before any await.
 * - supports both the promise form and the legacy callback form (older Safari returns undefined);
 * - settles as soon as Notification.permission leaves 'default', even if the browser never settles its promise
 *   (seen on mobile when the prompt is auto-dismissed or answered from the browser UI);
 * - gives up after LIMITE_PEDIDO_PERMISSAO_MS with the current permission, so an activation is never stuck.
 */
export function pedirPermissao(): Promise<NotificationPermission> {
    return new Promise<NotificationPermission>((resolve) => {
        let concluido = false;
        let intervalo: ReturnType<typeof setInterval> | undefined;
        let limite: ReturnType<typeof setTimeout> | undefined;
        const concluir = (valor?: NotificationPermission | null): void => {
            if (concluido) return;
            concluido = true;
            clearInterval(intervalo);
            clearTimeout(limite);
            resolve(valor === 'granted' || valor === 'denied' || valor === 'default' ? valor : Notification.permission);
        };
        try {
            const retorno = Notification.requestPermission(concluir) as Promise<NotificationPermission> | undefined;
            if (retorno && typeof retorno.then === 'function') {
                retorno.then(concluir, () => concluir(Notification.permission));
            }
        } catch {
            concluir(Notification.permission);
            return;
        }
        if (concluido) return;
        intervalo = setInterval(() => {
            if (Notification.permission !== 'default') concluir(Notification.permission);
        }, INTERVALO_VERIFICACAO_PERMISSAO_MS);
        limite = setTimeout(() => concluir(Notification.permission), LIMITE_PEDIDO_PERMISSAO_MS);
    });
}

/**
 * Enables notifications on this device. Must be called from a user click: the permission prompt is shown
 * before any await so browsers (Safari in particular) still see the user gesture.
 *
 * 'denied' maps to ERRO_PERMISSAO_NEGADA; 'default' (no decision: the browser showed no prompt, e.g. Chrome's
 * quieter permission UI, or it was dismissed) maps to ERRO_PERMISSAO_SEM_RESPOSTA so the UI can guide the user.
 */
export async function ativar(): Promise<PushPreferencias> {
    const suporte = suportePush();
    if (suporte === 'bloqueado') throw new Error(ERRO_PERMISSAO_NEGADA);
    if (suporte !== 'suportado') throw new Error(ERRO_NAO_SUPORTADO);

    // Already allowed (e.g. a previous attempt failed after the grant): no prompt, go straight to subscribing.
    const permissao = Notification.permission === 'granted' ? 'granted' : await pedirPermissao();
    if (permissao === 'denied') throw new Error(ERRO_PERMISSAO_NEGADA);
    if (permissao !== 'granted') throw new Error(ERRO_PERMISSAO_SEM_RESPOSTA);

    return concluirAtivacao();
}

/**
 * Disables notifications on this device: removes the server record (best effort) and the browser
 * subscription. Returns false when the server could not be told (it prunes dead endpoints on its own).
 */
export async function desativar(): Promise<boolean> {
    const inscricao = await obterInscricaoLocal();
    if (!inscricao) return true;
    let servidorAtualizado = true;
    try {
        await removerInscricaoPush(inscricao.endpoint);
    } catch {
        servidorAtualizado = false;
    }
    await inscricao.unsubscribe();
    return servidorAtualizado;
}

/**
 * Used by the explicit "Sair" buttons: removes this device's subscription before the session ends.
 * Never throws and never waits longer than limiteMs, so logout is not held hostage by the network.
 */
export async function desativarDispositivoSilenciosamente(limiteMs = 3000): Promise<void> {
    try {
        if (suportePush() !== 'suportado') return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
            desativar(),
            new Promise<void>((resolve) => { timer = setTimeout(resolve, limiteMs); })
        ]);
        clearTimeout(timer);
    } catch {
        /* failing silently is intended: logout must proceed */
    }
}

/** Applies new preferences on the server for this device. The local copy is updated only on success. */
export async function atualizarPreferencias(preferencias: PushPreferencias): Promise<PushPreferencias> {
    const inscricao = await obterInscricaoLocal();
    const dados = inscricao ? paraJson(inscricao) : null;
    if (!dados) throw new Error(ERRO_NAO_SUPORTADO);
    const resposta = await salvarInscricaoPush(dados, preferencias);
    const efetivas = normalizarPreferencias(resposta?.preferencias ?? preferencias);
    salvarPreferenciasLocais(efetivas);
    return efetivas;
}

export function enviarTeste(): Promise<void> {
    return enviarNotificacaoTeste();
}

/**
 * Re-binds an existing browser subscription to the current user (call after an administrator logs in,
 * on startup with an active session, or when the service worker reports a changed subscription).
 * Never throws: it is a background sync.
 */
export async function sincronizar(): Promise<void> {
    try {
        if (suportePush() !== 'suportado') return;
        if (Notification.permission !== 'granted') return;
        if (ativacaoEmCurso) return; // the activation in progress registers the subscription itself
        const inscricao = await obterInscricaoLocal();
        const dados = inscricao ? paraJson(inscricao) : null;
        if (!inscricao || !dados) return;
        const config = await obterConfigPush();
        if (!config.habilitado || !config.chavePublica) return;
        if (!mesmaChave(inscricao, urlBase64ToUint8Array(config.chavePublica))) {
            // Created with an older VAPID key: it can never receive pushes. Drop it so the banner and the
            // Settings card offer activation again instead of reporting notifications as active.
            await removerInscricaoPush(inscricao.endpoint).catch(() => undefined);
            await inscricao.unsubscribe().catch(() => false);
            // Same name as EVENTO_ESTADO_PUSH (pushActivation.ts imports this module, so it cannot be imported here).
            window.dispatchEvent(new CustomEvent('eduassets:push-estado'));
            return;
        }
        const locais = lerPreferenciasLocais();
        const resposta = await salvarInscricaoPush(dados, locais);
        salvarPreferenciasLocais(normalizarPreferencias(resposta?.preferencias ?? locais));
    } catch {
        /* 503 (push unavailable), network errors or an expired session: retried on the next login */
    }
}
