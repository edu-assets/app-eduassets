import { listarResponsaveis } from '../api/responsaveis.js';
import type { Responsavel } from '../../types/index.js';
import { getSessionDataVersion } from './sessionDataVersion.js';
import { isAutenticado } from './authStore.js';

type ResponsavelListener = (responsaveis: Responsavel[]) => void;

let responsaveis: Responsavel[] = [];
let listeners: ResponsavelListener[] = [];

export async function carregarResponsaveis(): Promise<Responsavel[]> {
    if (!isAutenticado()) {
        limparResponsaveis();
        return responsaveis;
    }
    const version = getSessionDataVersion();
    const dados = await listarResponsaveis();
    if (version !== getSessionDataVersion() || !isAutenticado()) return responsaveis;
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
