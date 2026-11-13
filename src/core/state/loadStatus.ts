/**
 * Estado da CARGA INICIAL de cada lista (empréstimos, equipamentos, ocorrências).
 *
 * Só a primeira carga (ou a nova tentativa manual) coloca a lista em 'carregando'. Atualizações em segundo plano
 * (sincronização ao vivo, recarga após mutação) nunca mudam o estado de 'pronto', nem em caso de falha.
 */
export type ChaveCarga = 'equipamentos' | 'emprestimos' | 'ocorrencias';
export type EstadoCarga = 'idle' | 'carregando' | 'pronto' | 'erro';
export interface StatusCarga { status: EstadoCarga }

type Listener = (chave: ChaveCarga, status: StatusCarga) => void;

const CHAVES: readonly ChaveCarga[] = ['equipamentos', 'emprestimos', 'ocorrencias'];
const status: Record<ChaveCarga, StatusCarga> = {
    equipamentos: { status: 'idle' },
    emprestimos: { status: 'idle' },
    ocorrencias: { status: 'idle' },
};
const carregadores: Partial<Record<ChaveCarga, () => Promise<unknown>>> = {};
let listeners: Listener[] = [];

export function getLoadStatus(chave: ChaveCarga): StatusCarga {
    return status[chave];
}

export function subscribeLoadStatus(callback: Listener): () => void {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function definir(chave: ChaveCarga, novo: EstadoCarga): void {
    if (status[chave].status === novo) return;
    status[chave] = { status: novo };
    listeners.forEach((callback) => callback(chave, status[chave]));
}

/** Chamado pelo store ao iniciar uma leitura: só a primeira carga (idle) vira 'carregando'. */
export function iniciarCarga(chave: ChaveCarga): void {
    if (status[chave].status === 'idle') definir(chave, 'carregando');
}

export function concluirCarga(chave: ChaveCarga): void {
    definir(chave, 'pronto');
}

/** Falha de leitura: só vira 'erro' se ainda não havia dados carregados (segundo plano não derruba a tela). */
export function falharCarga(chave: ChaveCarga): void {
    if (status[chave].status !== 'pronto') definir(chave, 'erro');
}

/** Sessão trocada/limpa: a próxima carga é inicial de novo. */
export function reiniciarCarga(chave: ChaveCarga): void {
    definir(chave, 'carregando');
}

/** Falha global antes de qualquer leitura (ex.: API indisponível): listas ainda sem dados passam a 'erro'. */
export function falharCargasPendentes(): void {
    CHAVES.forEach((chave) => {
        if (status[chave].status === 'carregando' || status[chave].status === 'idle') definir(chave, 'erro');
    });
}

export function registrarCarregador(chave: ChaveCarga, carregador: () => Promise<unknown>): void {
    carregadores[chave] = carregador;
}

/** Nova tentativa manual: mostra o carregamento de novo e refaz a leitura do store. */
export function tentarNovamente(chave: ChaveCarga): Promise<void> {
    const carregador = carregadores[chave];
    if (!carregador) return Promise.resolve();
    definir(chave, 'carregando');
    return carregador().then(() => undefined, () => undefined);
}
