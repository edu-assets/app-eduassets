import {
    listarEmprestimosAtivos,
    listarPaginaEmprestimos,
    normalizarFiltros,
    criarEmprestimo,
    atualizarItensEmprestimo,
    devolverEmprestimo,
    confirmarRetiradaEmprestimo,
    excluirEmprestimoAgendado,
    LIMITE_PAGINA_PADRAO,
    LIMITE_PAGINA_MAXIMO,
    MAX_PAGINAS
} from '../api/emprestimos.js';
import type { FiltrosEmprestimos } from '../api/emprestimos.js';
import type { Emprestimo, LoanUI, LoanDraft, LoanUpdate } from '../../types/index.js';
import type { OpcoesLeitura } from '../api/apiClient.js';
import { iniciarCarga, concluirCarga, falharCarga, reiniciarCarga, registrarCarregador } from './loadStatus.js';
import { getSessionDataVersion } from './sessionDataVersion.js';
import { carregarEquipamentos } from './equipamentoStore.js';
import { isAutenticado } from './authStore.js';
import { mapEmprestimo } from './loanMapper.js';
import { criarLeituraOrdenada, mesmoConteudo } from './leituraOrdenada.js';

export { mapEmprestimo } from './loanMapper.js';

/**
 * Estado dos empréstimos, em duas partes:
 *
 * - `ativos`: TODOS os empréstimos não devolvidos: ABERTO (Devoluções, contagem de itens emprestados no estoque) e
 *   AGENDADO (reservas futuras; não alteram `quantidadeDisponivel`). Autenticado: `GET /emprestimos?status=ATIVO`
 *   (array completo). Convidado: percorre as páginas de status=ATIVO. `getLoansAbertos()` devolve só os ABERTO e
 *   `getAgendamentos()` só os AGENDADO.
 * - `historico`: lista paginada do Dashboard › Histórico (`paginado=1`, ordem dataRetirada desc), com filtros
 *   (status/de/ate/q) e "Carregar mais".
 *
 * Sincronização ao vivo / recarga após operação (`carregarEmprestimos`): recarrega `ativos` inteiro e ATUALIZA o
 * histórico desde o início, buscando de novo a MESMA quantidade de itens já carregada (mínimo 50, em páginas de até
 * 100; a última pede só o que falta). Assim quem já clicou em "Carregar mais" não perde as páginas extras nem vê a
 * lista "pular" de volta para 50 itens; um empréstimo novo entra no topo e o último item passa para o próximo
 * "Carregar mais" (o nextCursor é o do último item recarregado).
 *
 * As operações do histórico (atualizar, carregar mais, trocar filtros) rodam em fila, uma de cada vez: cada uma lê o
 * estado atual ao começar, então uma atualização nunca descarta uma página anexada em paralelo.
 */

export type FiltrosHistorico = FiltrosEmprestimos;

export interface HistoricoEstado {
    items: LoanUI[];
    nextCursor: number | null;
    filtros: FiltrosHistorico;
    /** Leitura iniciada pelo usuário em andamento (troca de filtros ou "Carregar mais"). */
    carregando: boolean;
    /** Mensagem da última falha de uma leitura iniciada pelo usuário; null após um sucesso. */
    erro: string | null;
}

type LoanListener = (abertos: LoanUI[]) => void;
type HistoricoListener = (historico: HistoricoEstado) => void;

let ativos: LoanUI[] = [];
let historico: HistoricoEstado = { items: [], nextCursor: null, filtros: {}, carregando: false, erro: null };
let listeners: LoanListener[] = [];
let listenersHistorico: HistoricoListener[] = [];

const leiturasAtivos = criarLeituraOrdenada();
/** Muda sempre que o histórico é descartado (troca de filtros ou de sessão): operações enfileiradas antes são ignoradas. */
let geracaoHistorico = 0;
let filaHistorico: Promise<unknown> = Promise.resolve();

function enfileirarHistorico<T>(operacao: () => Promise<T>): Promise<T> {
    const execucao = filaHistorico.then(operacao, operacao);
    filaHistorico = execucao.catch(() => undefined);
    return execucao;
}

function mensagemErro(erro: unknown): string {
    return erro instanceof Error && erro.message ? erro.message : String(erro);
}

function definirHistorico(parcial: Partial<HistoricoEstado>): void {
    historico = { ...historico, ...parcial };
    notifyHistorico();
}

/* ===== Ativos (abertos + agendados) ===== */

/** Recarrega os empréstimos ATIVOS (ABERTO e AGENDADO). Devolve os ABERTO (compatível com o nome antigo). */
export async function carregarAbertos(opcoes?: OpcoesLeitura): Promise<LoanUI[]> {
    const version = getSessionDataVersion();
    const leitura = leiturasAtivos.iniciar();
    const dados = await listarEmprestimosAtivos(isAutenticado(), opcoes);
    if (version !== getSessionDataVersion() || !leiturasAtivos.podeAplicar(leitura)) return getLoansAbertos();
    definirAtivos(dados.map(mapEmprestimo));
    return getLoansAbertos();
}

/** Aplica a lista (mantendo a ordem do servidor) e notifica só se algo mudou. */
function definirAtivos(novos: LoanUI[]): void {
    if (mesmoConteudo(novos, ativos)) return;
    ativos = novos;
    notify();
}

/* ===== Histórico ===== */

/**
 * Atualiza o histórico desde a primeira página mantendo (pelo menos) a quantidade já carregada.
 * Não mexe em `carregando`; falhas não apagam a lista (o chamador decide o que fazer com o erro).
 */
function atualizarHistorico(opcoes?: OpcoesLeitura): Promise<void> {
    return enfileirarHistorico(async () => {
        const version = getSessionDataVersion();
        const geracao = geracaoHistorico;
        const filtros = historico.filtros;
        const alvo = Math.max(historico.items.length, LIMITE_PAGINA_PADRAO);
        const autenticado = isAutenticado();

        const itens: Emprestimo[] = [];
        let cursor: number | null = null;
        for (let paginas = 0; paginas < MAX_PAGINAS; paginas++) {
            // Páginas de até 100; a última pede só o que falta para chegar à quantidade que já estava carregada.
            const limit = Math.min(LIMITE_PAGINA_MAXIMO, alvo - itens.length);
            const pagina = await listarPaginaEmprestimos({ filtros, cursor, limit, autenticado }, opcoes);
            itens.push(...pagina.items);
            cursor = pagina.nextCursor;
            if (cursor === null || itens.length >= alvo) break;
        }

        if (version !== getSessionDataVersion() || geracao !== geracaoHistorico) return;
        const novos = deduplicar(itens.map(mapEmprestimo));
        if (mesmoConteudo(novos, historico.items) && cursor === historico.nextCursor) {
            if (historico.erro) definirHistorico({ erro: null });
            return;
        }
        definirHistorico({ items: novos, nextCursor: cursor, erro: null });
    });
}

/** Próxima página do histórico ("Carregar mais"). Sem `nextCursor` ou com leitura em andamento, não faz nada. */
export function carregarMaisHistorico(): Promise<void> {
    if (historico.nextCursor === null || historico.carregando) return Promise.resolve();
    const geracao = geracaoHistorico;
    definirHistorico({ carregando: true, erro: null });
    return enfileirarHistorico(async () => {
        if (geracao !== geracaoHistorico) return;
        const version = getSessionDataVersion();
        const cursor = historico.nextCursor;
        if (cursor === null) {
            definirHistorico({ carregando: false });
            return;
        }
        try {
            const pagina = await listarPaginaEmprestimos({
                filtros: historico.filtros, cursor, limit: LIMITE_PAGINA_PADRAO, autenticado: isAutenticado()
            });
            if (version !== getSessionDataVersion() || geracao !== geracaoHistorico) return;
            definirHistorico({
                items: deduplicar([...historico.items, ...pagina.items.map(mapEmprestimo)]),
                nextCursor: pagina.nextCursor,
                carregando: false,
                erro: null
            });
        } catch (erro) {
            if (version !== getSessionDataVersion() || geracao !== geracaoHistorico) return;
            definirHistorico({ carregando: false, erro: mensagemErro(erro) });
        }
    });
}

/** Descarta o histórico e carrega a primeira página com os filtros atuais (troca de filtros, "Tentar novamente"). */
export function recarregarHistorico(): Promise<void> {
    geracaoHistorico += 1;
    const geracao = geracaoHistorico;
    definirHistorico({ items: [], nextCursor: null, carregando: true, erro: null });
    return enfileirarHistorico(async () => {
        if (geracao !== geracaoHistorico) return;
        const version = getSessionDataVersion();
        try {
            const pagina = await listarPaginaEmprestimos({
                filtros: historico.filtros, limit: LIMITE_PAGINA_PADRAO, autenticado: isAutenticado()
            });
            if (version !== getSessionDataVersion() || geracao !== geracaoHistorico) return;
            definirHistorico({
                items: deduplicar(pagina.items.map(mapEmprestimo)),
                nextCursor: pagina.nextCursor,
                carregando: false,
                erro: null
            });
        } catch (erro) {
            if (version !== getSessionDataVersion() || geracao !== geracaoHistorico) return;
            definirHistorico({ carregando: false, erro: mensagemErro(erro) });
        }
    });
}

/**
 * Altera os filtros do histórico (mescla com os atuais; `undefined`/'' remove um filtro) e recarrega a página 1.
 * Filtros iguais aos atuais não recarregam. Para convidados `q` não vai à API (o servidor recusa): fica guardado e a
 * tela filtra localmente os itens carregados — mudar só `q` não recarrega.
 */
export function definirFiltrosHistorico(parcial: Partial<FiltrosHistorico>): Promise<void> {
    const novos = normalizarFiltros({ ...historico.filtros, ...parcial });
    const atuais = historico.filtros;
    if (mesmoConteudo(novos, atuais)) return Promise.resolve();
    const soBuscaMudou = novos.status === atuais.status && novos.de === atuais.de && novos.ate === atuais.ate;
    historico = { ...historico, filtros: novos };
    if (soBuscaMudou && !isAutenticado()) {
        notifyHistorico();
        return Promise.resolve();
    }
    return recarregarHistorico();
}

/** Remove todos os filtros e recarrega a página 1. */
export function limparFiltrosHistorico(opcoes: { recarregar?: boolean } = {}): Promise<void> {
    if (opcoes.recarregar === false) {
        // Troca/fim de sessão: só zera os filtros (inclui a busca) localmente; a recarga fica com a sincronização da sessão.
        if (Object.keys(historico.filtros).length) {
            historico = { ...historico, filtros: {} };
            notifyHistorico();
        }
        return Promise.resolve();
    }
    return definirFiltrosHistorico({ status: undefined, de: undefined, ate: undefined, q: undefined });
}

export function getHistorico(): HistoricoEstado {
    return historico;
}

export function getFiltrosHistorico(): FiltrosHistorico {
    return historico.filtros;
}

/** True quando há mais páginas no servidor (mostrar "Carregar mais"). */
export function temMaisHistorico(): boolean {
    return historico.nextCursor !== null;
}

export function subscribeHistorico(callback: HistoricoListener): () => void {
    listenersHistorico.push(callback);
    return () => {
        listenersHistorico = listenersHistorico.filter((listener) => listener !== callback);
    };
}

function notifyHistorico(): void {
    listenersHistorico.forEach((callback) => callback(historico));
}

/* ===== Carga combinada (sessão, sincronização ao vivo, após operações) ===== */

/**
 * Recarrega `ativos` (completo) e atualiza o histórico mantendo as páginas carregadas. Com `passivo` (sincronização
 * ao vivo) as requisições não renovam o timeout do admin. Só a primeira carga mostra o esqueleto (loadStatus).
 */
export async function carregarEmprestimos(opcoes?: OpcoesLeitura): Promise<LoanUI[]> {
    const version = getSessionDataVersion();
    iniciarCarga('emprestimos');
    const resultados = await Promise.allSettled([carregarAbertos(opcoes), atualizarHistorico(opcoes)]);
    const falha = resultados.find((resultado): resultado is PromiseRejectedResult => resultado.status === 'rejected');
    if (falha) {
        if (version === getSessionDataVersion()) falharCarga('emprestimos');
        throw falha.reason;
    }
    if (version === getSessionDataVersion()) concluirCarga('emprestimos');
    return getLoansAbertos();
}

registrarCarregador('emprestimos', () => carregarEmprestimos());

/** Todos os empréstimos em aberto (ABERTO), completo. Não inclui agendamentos. */
export function getLoansAbertos(): LoanUI[] {
    return ativos.filter((loan) => loan.status === 'aberto');
}

/** Agendamentos (AGENDADO), do início mais próximo para o mais distante (id desempata). */
export function getAgendamentos(): LoanUI[] {
    const inicio = (loan: LoanUI): number => new Date(loan.dataAgendada ?? loan.data).getTime();
    return ativos
        .filter((loan) => loan.status === 'agendado')
        .sort((a, b) => (inicio(a) - inicio(b)) || a.id - b.id);
}

/** Abertos + agendados, na ordem do servidor. */
export function getLoansAtivos(): LoanUI[] {
    return ativos;
}

/** Sessão trocada/limpa. Os filtros do histórico são mantidos (a busca da tela continua valendo). */
export function limparEmprestimos(): void {
    reiniciarCarga('emprestimos');
    geracaoHistorico += 1;
    ativos = [];
    historico = { ...historico, items: [], nextCursor: null, carregando: false, erro: null };
    notify();
    notifyHistorico();
}

/**
 * Registra um empréstimo. Com `dataRetiradaISO` no futuro (> 5 min) o servidor cria um AGENDADO e exige
 * `dataPrevistaDevolucaoISO`. Devolve o registro criado.
 */
export async function addLoan(loan: LoanDraft): Promise<Emprestimo> {
    const criado = await criarEmprestimo({
        solicitanteNome: loan.aluno,
        responsavelId: Number(loan.responsavelId),
        ...(loan.dataRetiradaISO ? { dataRetirada: loan.dataRetiradaISO } : {}),
        ...(loan.dataPrevistaDevolucaoISO ? { dataPrevistaDevolucao: loan.dataPrevistaDevolucaoISO } : {}),
        observacao: loan.observacao || undefined,
        itens: loan.itens.map((item) => ({ equipamentoId: Number(item.id), quantidade: item.quantidade }))
    });
    await recarregarAposMutacao();
    return criado;
}

/**
 * Confirma a retirada de um agendamento (AGENDADO → ABERTO). O estado local é atualizado na hora (o item passa de
 * `getAgendamentos()` para `getLoansAbertos()` e o histórico é corrigido) e as listas são recarregadas em seguida.
 * Erros 409 (`nao_agendado`, `confirmacao_fora_da_janela`, `unidades_nao_devolvidas`) sobem como `ApiError`.
 */
export async function confirmarRetirada(id: number): Promise<Emprestimo> {
    const confirmado = await confirmarRetiradaEmprestimo(id);
    const atualizado = mapEmprestimo(confirmado);
    definirAtivos(ativos.some((loan) => loan.id === id)
        ? ativos.map((loan) => (loan.id === id ? atualizado : loan))
        : [...ativos, atualizado]);
    if (historico.items.some((loan) => loan.id === id)) {
        definirHistorico({ items: historico.items.map((loan) => (loan.id === id ? atualizado : loan)) });
    }
    await recarregarAposMutacao();
    return confirmado;
}

/** Exclui um agendamento: some na hora de `getAgendamentos()` e do histórico; depois recarrega as listas. */
export async function excluirAgendamento(id: number): Promise<void> {
    await excluirEmprestimoAgendado(id);
    definirAtivos(ativos.filter((loan) => loan.id !== id));
    if (historico.items.some((loan) => loan.id === id)) {
        definirHistorico({ items: historico.items.filter((loan) => loan.id !== id) });
    }
    await recarregarAposMutacao();
}

/** Sem `dataDevolucao` o servidor registra a devolução com o próprio horário. */
/** Retorna o empréstimo devolvido (com a data gravada pelo servidor). */
export async function returnLoan(id: number, dataDevolucao?: string): Promise<Emprestimo> {
    const devolvido = await devolverEmprestimo(id, dataDevolucao);
    await recarregarAposMutacao();
    return devolvido;
}

export async function updateLoan(id: number, updates: LoanUpdate): Promise<void> {
    if (updates.itens) {
        // Conversão para number é necessária: a API espera equipamentoId numérico.
        await atualizarItensEmprestimo(id, updates.itens.map((item) => ({
            equipamentoId: Number(item.id),
            quantidade: item.quantidade
        })));
    }
    await recarregarAposMutacao();
}

// Empréstimo, devolução e edição de itens alteram as quantidades dos equipamentos no servidor.
async function recarregarAposMutacao(): Promise<void> {
    // A operação já foi aplicada: uma falha ao recarregar as listas não deve parecer falha do registro
    // (o usuário repetiria a ação e duplicaria o registro); a sincronização ao vivo corrige em seguida.
    const resultados = await Promise.allSettled([carregarEmprestimos(), carregarEquipamentos()]);
    resultados.forEach((resultado) => {
        if (resultado.status === 'rejected') console.warn('[eduAssets] Falha ao recarregar após a operação:', resultado.reason);
    });
}

/**
 * Assina mudanças nos empréstimos ATIVOS (abertos e agendados). O callback recebe os ABERTO; para os agendamentos
 * leia `getAgendamentos()` dentro do callback. Para o histórico use `subscribeHistorico`.
 */
export function subscribe(callback: LoanListener): () => void {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function notify(): void {
    const abertos = getLoansAbertos();
    listeners.forEach((callback) => callback(abertos));
}

function deduplicar(loans: LoanUI[]): LoanUI[] {
    const vistos = new Set<number>();
    return loans.filter((loan) => {
        if (vistos.has(loan.id)) return false;
        vistos.add(loan.id);
        return true;
    });
}
