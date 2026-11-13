import { obterEstadoSync } from '../api/sync.js';
import { isAutenticado, subscribe as subscribeAuth } from './authStore.js';
import { carregarEquipamentos } from './equipamentoStore.js';
import { carregarEmprestimos } from './loanStore.js';
import { carregarOcorrencias } from './ocorrenciasStore.js';
import { carregarResponsaveis } from './responsavelStore.js';
import { getSessionDataVersion } from './sessionDataVersion.js';

/**
 * Sincronização ao vivo: mantém os stores atualizados sem recarregar a página e sem limpar a tela.
 *
 * - Autenticado com a aba visível: consulta leve `GET /sync/estado?desde=<cursor>` a cada 30 s (passiva) e
 *   recarrega só os stores das entidades que mudaram.
 * - Gatilhos imediatos: voltar para a aba (visibilitychange/focus), `online` e push recebido.
 * - Rede de segurança: recarga completa silenciosa a cada 5 min com a aba visível.
 * - Erros de rede: recuo 30 → 60 → 120 s.
 * - API antiga (404 em /sync/estado): sem polling; recarga completa ao voltar para a aba (no máximo 1×/min) e
 *   após push.
 * - Convidado: sem polling; só recarga (pública) ao voltar para a aba, no máximo 1×/min.
 * - Nunca há duas atualizações simultâneas (single-flight + uma repetição pendente) e nada é aplicado se a
 *   sessão mudou durante a requisição. Todas as requisições automáticas são passivas (não renovam o timeout do admin).
 */

type ChaveStore = 'equipamentos' | 'emprestimos' | 'ocorrencias' | 'responsaveis';

interface Pedido {
    /** Consultar /sync/estado (ou, sem sync/convidado, recarregar tudo) em vez de recarregar stores específicos. */
    consultar: boolean;
    /** Stores pedidos explicitamente (`atualizarAgora(entidades)`). */
    stores: Set<ChaveStore>;
    /** Ignora o limite de 1 recarga por minuto (push/ação explícita). */
    forcar: boolean;
    /** Consulta disparada no início da sessão, junto com a carga inicial das listas. */
    inicial: boolean;
}

export const INTERVALO_POLLING_MS = 30_000;
export const INTERVALOS_RECUO_MS = [30_000, 60_000, 120_000] as const;
export const INTERVALO_RECARGA_COMPLETA_MS = 5 * 60_000;
export const INTERVALO_MINIMO_RETORNO_MS = 60_000;
/** Depois de um 404 em /sync/estado, tenta de novo após este tempo (deploy em andamento, proxy momentâneo). */
export const ESPERA_APOS_404_MS = 5 * 60_000;
/** Intervalo mínimo entre consultas disparadas por foco/visibilidade/rede (o polling não é afetado). */
export const INTERVALO_MINIMO_GATILHO_MS = 5_000;
/**
 * O primeiro cursor é lido em paralelo com a carga inicial das listas; recuar esta margem faz a próxima consulta
 * reportar as mudanças gravadas nesse intervalo (custa, no máximo, uma recarga extra dos stores afetados).
 */
export const MARGEM_CURSOR_INICIAL = 50;

const ENTIDADE_PARA_STORES: Record<string, readonly ChaveStore[]> = {
    Emprestimo: ['emprestimos', 'equipamentos'],
    Ocorrencia: ['ocorrencias', 'equipamentos'],
    Equipamento: ['equipamentos'],
    Categoria: ['equipamentos'],
    Responsavel: ['responsaveis']
};

const STORES_PUBLICOS: readonly ChaveStore[] = ['equipamentos', 'emprestimos', 'ocorrencias'];
const STORES_AUTENTICADO: readonly ChaveStore[] = [...STORES_PUBLICOS, 'responsaveis'];

const CARREGADORES: Record<ChaveStore, (opcoes: { passivo: true }) => Promise<unknown>> = {
    equipamentos: (opcoes) => carregarEquipamentos(opcoes),
    emprestimos: (opcoes) => carregarEmprestimos(opcoes),
    ocorrencias: (opcoes) => carregarOcorrencias(opcoes),
    responsaveis: (opcoes) => carregarResponsaveis(opcoes)
};

let iniciado = false;
let cancelarAuth: (() => void) | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let cursor: string | undefined;
/** Até quando /sync/estado é considerado indisponível (404). 0 = disponível. */
let semSyncAte = 0;
let ultimaConsulta = 0;
let falhasConsecutivas = 0;
let ultimaRecargaCompleta = 0;
/** Muda a cada troca de sessão para invalidar execuções em andamento. */
let geracao = 0;
let emExecucao: Promise<void> | null = null;
let pendente: Pedido | null = null;

function semSync(): boolean {
    return Date.now() < semSyncAte;
}

function visivel(): boolean {
    return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

function novoPedido(parcial: Partial<Pedido>): Pedido {
    return { consultar: false, stores: new Set(), forcar: false, inicial: false, ...parcial };
}

function mesclar(a: Pedido | null, b: Pedido): Pedido {
    if (!a) return b;
    return {
        consultar: a.consultar || b.consultar,
        stores: new Set([...a.stores, ...b.stores]),
        forcar: a.forcar || b.forcar,
        inicial: a.inicial || b.inicial
    };
}

/** Stores a recarregar para as entidades alteradas informadas pelo servidor. Entidades desconhecidas são ignoradas. */
export function storesDasEntidades(entidades: readonly string[]): ChaveStore[] {
    const resultado = new Set<ChaveStore>();
    for (const entidade of entidades) {
        ENTIDADE_PARA_STORES[entidade]?.forEach((chave) => resultado.add(chave));
    }
    return [...resultado];
}

function statusDoErro(erro: unknown): number | undefined {
    return typeof erro === 'object' && erro !== null && 'status' in erro
        ? Number((erro as { status: unknown }).status)
        : undefined;
}

/** Retorna true quando todos os stores foram recarregados e a sessão continua a mesma. */
async function recarregar(chaves: Iterable<ChaveStore>, minhaGeracao: number): Promise<boolean> {
    const lista = [...new Set(chaves)];
    if (!lista.length) return true;
    const resultados = await Promise.allSettled(lista.map((chave) => CARREGADORES[chave]({ passivo: true })));
    return minhaGeracao === geracao && resultados.every((resultado) => resultado.status === 'fulfilled');
}

async function recargaCompleta(minhaGeracao: number): Promise<boolean> {
    const ok = await recarregar(isAutenticado() ? STORES_AUTENTICADO : STORES_PUBLICOS, minhaGeracao);
    if (ok) ultimaRecargaCompleta = Date.now();
    return ok;
}

async function processar(pedido: Pedido): Promise<void> {
    const minhaGeracao = geracao;
    const versao = getSessionDataVersion();
    const autenticado = isAutenticado();

    try {
        let ok = true;

        if (pedido.stores.size) ok = await recarregar(pedido.stores, minhaGeracao);

        if (pedido.consultar) {
            if (!autenticado || semSync()) {
                // Sem /sync/estado: recarga completa silenciosa, no máximo 1×/min nos gatilhos de retorno.
                if (pedido.forcar || Date.now() - ultimaRecargaCompleta >= INTERVALO_MINIMO_RETORNO_MS) {
                    ok = (await recargaCompleta(minhaGeracao)) && ok;
                }
            } else {
                ok = (await consultarMudancas(minhaGeracao, versao, pedido.inicial)) && ok;
            }
        }

        if (minhaGeracao !== geracao) return;
        falhasConsecutivas = ok ? 0 : falhasConsecutivas + 1;
    } catch (erro) {
        if (minhaGeracao !== geracao) return;
        falhasConsecutivas += 1;
        console.warn('[eduAssets] Falha na sincronização ao vivo:', erro);
    }
}

async function consultarMudancas(minhaGeracao: number, versao: number, inicial: boolean): Promise<boolean> {
    let estado;
    ultimaConsulta = Date.now();
    try {
        estado = await obterEstadoSync(cursor);
    } catch (erro) {
        if (statusDoErro(erro) === 404) {
            // API sem /sync/estado: cai para recarga completa e para de consultar.
            semSyncAte = Date.now() + ESPERA_APOS_404_MS;
            if (timer) clearTimeout(timer);
            timer = undefined;
            return minhaGeracao !== geracao ? true : recargaCompleta(minhaGeracao);
        }
        throw erro;
    }

    // Resposta de outra sessão: descarta, sem mexer no cursor.
    if (minhaGeracao !== geracao || versao !== getSessionDataVersion()) return true;

    const primeiraConsulta = cursor === undefined;
    const entidades = Array.isArray(estado.entidades) ? estado.entidades : [];
    const agora = Date.now();
    // Cursor do servidor menor que o local (ex.: banco restaurado de backup): o histórico não é confiável, recarrega tudo.
    const cursorRegrediu = !primeiraConsulta && typeof estado.cursor === 'string' && Number(estado.cursor) < Number(cursor);
    const recargaDeSeguranca = cursorRegrediu ||
        (!primeiraConsulta && agora - ultimaRecargaCompleta >= INTERVALO_RECARGA_COMPLETA_MS);

    let ok: boolean;
    let novoCursor = typeof estado.cursor === 'string' ? estado.cursor : undefined;
    if (recargaDeSeguranca) {
        ok = await recargaCompleta(minhaGeracao);
    } else if (!primeiraConsulta) {
        ok = await recarregar(storesDasEntidades(entidades), minhaGeracao);
    } else if (inicial) {
        // Início da sessão: as listas acabaram de ser carregadas; recua a margem para cobrir a corrida com elas.
        ok = true;
        if (novoCursor !== undefined) novoCursor = String(Math.max(0, Number(novoCursor) - MARGEM_CURSOR_INICIAL));
    } else {
        // Sem cursor fora do início da sessão (a consulta inicial falhou): não há como saber o que mudou.
        ok = await recargaCompleta(minhaGeracao);
    }

    // O cursor só avança depois do sucesso: em caso de falha a próxima consulta repete as mesmas entidades.
    if (ok && minhaGeracao === geracao && novoCursor !== undefined) cursor = novoCursor;
    return ok;
}

function pedir(pedido: Pedido): Promise<void> {
    if (emExecucao) {
        pendente = mesclar(pendente, pedido);
        return emExecucao;
    }
    emExecucao = (async () => {
        try {
            let atual: Pedido | null = pedido;
            while (atual) {
                pendente = null;
                await processar(atual);
                atual = pendente;
            }
        } finally {
            emExecucao = null;
        }
    })();
    return emExecucao;
}

function intervaloAtual(): number {
    return INTERVALOS_RECUO_MS[Math.min(falhasConsecutivas, INTERVALOS_RECUO_MS.length - 1)];
}

function agendar(): void {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (!iniciado || !isAutenticado() || !visivel()) return;
    // Após um 404 o polling volta sozinho quando a espera termina.
    const espera = semSync() ? semSyncAte - Date.now() : intervaloAtual();
    timer = setTimeout(() => {
        timer = undefined;
        void pedir(novoPedido({ consultar: true })).finally(agendar);
    }, espera);
}

/** Voltar para a aba / foco / rede: atualiza na hora, mas não repete se já houver uma atualização em curso. */
function aoRetornar(): void {
    if (!iniciado || !visivel()) return;
    if (emExecucao) return;
    // Alt-tab frequente não deve gastar a cota de /sync/estado (compartilhada por IP).
    if (isAutenticado() && !semSync() && Date.now() - ultimaConsulta < INTERVALO_MINIMO_GATILHO_MS) return;
    void pedir(novoPedido({ consultar: true })).finally(agendar);
}

function aoMudarVisibilidade(): void {
    if (visivel()) aoRetornar();
    else agendar();
}

function reiniciarSessao(): void {
    geracao += 1;
    cursor = undefined;
    falhasConsecutivas = 0;
    semSyncAte = 0;
    ultimaConsulta = 0;
    pendente = null;
    // Troca de sessão: o coordenador acabou de recarregar tudo.
    ultimaRecargaCompleta = Date.now();
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (isAutenticado() && visivel()) {
        // Obtém o cursor logo, em paralelo com a carga inicial da sessão.
        void pedir(novoPedido({ consultar: true, inicial: true })).finally(agendar);
    }
}

/**
 * Atualiza os dados agora (ex.: push recebido), mesmo com a aba oculta. Sem argumentos consulta o servidor
 * para saber o que mudou; com `entidades` (nomes do AuditLog) recarrega diretamente os stores afetados.
 * Execuções simultâneas são coalescidas: no máximo uma em curso e uma repetição pendente.
 */
export function atualizarAgora(entidades?: readonly string[]): Promise<void> {
    const pedido = entidades
        ? novoPedido({ stores: new Set(storesDasEntidades(entidades)), forcar: true })
        : novoPedido({ consultar: true, forcar: true });
    const execucao = pedir(pedido);
    return execucao.finally(agendar);
}

/** Inicia os gatilhos e o polling. Idempotente. Chamar depois do login/estado de sessão estar definido. */
export function iniciarLiveSync(): void {
    if (iniciado) return;
    iniciado = true;
    ultimaRecargaCompleta = Date.now();
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener('focus', aoRetornar);
    window.addEventListener('online', aoRetornar);
    cancelarAuth = subscribeAuth(() => reiniciarSessao());
    reiniciarSessao();
}

/** Para o polling e remove os gatilhos (usado em testes). */
export function pararLiveSync(): void {
    iniciado = false;
    geracao += 1;
    pendente = null;
    if (timer) clearTimeout(timer);
    timer = undefined;
    document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    window.removeEventListener('focus', aoRetornar);
    window.removeEventListener('online', aoRetornar);
    cancelarAuth?.();
    cancelarAuth = undefined;
}
