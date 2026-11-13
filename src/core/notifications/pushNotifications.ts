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

/**
 * Subscribes this browser to push and registers the subscription on the server. Requires the notification
 * permission to be granted already (no prompt is shown here), so it also serves the automatic activation
 * that runs after the user allows notifications manually in the browser UI.
 */
export async function concluirAtivacao(): Promise<PushPreferencias> {
    if (suportePush() !== 'suportado') throw new Error(ERRO_NAO_SUPORTADO);
    if (Notification.permission !== 'granted') throw new Error(ERRO_PERMISSAO_NEGADA);

    const config = await obterConfigPush();
    if (!config.habilitado || !config.chavePublica) throw new Error(ERRO_PUSH_INDISPONIVEL);

    const registro = await obterRegistro();
    if (!registro) throw new Error(ERRO_NAO_SUPORTADO);

    const chave = urlBase64ToUint8Array(config.chavePublica);
    let inscricao = await registro.pushManager.getSubscription();
    let criadaAgora = false;
    if (inscricao && !mesmaChave(inscricao, chave)) {
        // Subscription made with another VAPID key (keys were rotated): it can never receive pushes again.
        await inscricao.unsubscribe();
        inscricao = null;
    }
    if (!inscricao) {
        inscricao = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave });
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

    const permissao = await Notification.requestPermission();
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
        const inscricao = await obterInscricaoLocal();
        const dados = inscricao ? paraJson(inscricao) : null;
        if (!dados) return;
        const locais = lerPreferenciasLocais();
        const resposta = await salvarInscricaoPush(dados, locais);
        salvarPreferenciasLocais(normalizarPreferencias(resposta?.preferencias ?? locais));
    } catch {
        /* 503 (push unavailable), network errors or an expired session: retried on the next login */
    }
}
