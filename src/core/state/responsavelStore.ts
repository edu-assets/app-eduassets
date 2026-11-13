import { listarResponsaveis } from '../api/responsaveis.js';
import type { Responsavel } from '../../types/index.js';
import { getSessionDataVersion } from './sessionDataVersion.js';
import { isAutenticado } from './authStore.js';
import type { OpcoesLeitura } from '../api/apiClient.js';
import { criarLeituraOrdenada, mesmoConteudo } from './leituraOrdenada.js';

const leituras = criarLeituraOrdenada();

type ResponsavelListener = (responsaveis: Responsavel[]) => void;

let responsaveis: Responsavel[] = [];
let listeners: ResponsavelListener[] = [];

export async function carregarResponsaveis(opcoes?: OpcoesLeitura): Promise<Responsavel[]> {
    if (!isAutenticado()) {
        limparResponsaveis();
        return responsaveis;
    }
    const version = getSessionDataVersion();
    const leitura = leituras.iniciar();
    const dados = await listarResponsaveis(opcoes);
    if (version !== getSessionDataVersion() || !isAutenticado() || !leituras.podeAplicar(leitura)) return responsaveis;
    if (mesmoConteudo(dados, responsaveis)) return responsaveis;
    responsaveis = dados;
    notify();
    return responsaveis;
}

export function limparResponsaveis(): void {
    responsaveis = [];
    notify();
}

export function getResponsaveis(): Responsavel[] {
    return responsaveis;
}

export function subscribe(callback: ResponsavelListener): () => void {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function notify(): void {
    listeners.forEach((callback) => callback(responsaveis));
}
