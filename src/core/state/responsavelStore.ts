import { listarResponsaveis } from '../api/responsaveis.js';
import type { Responsavel } from '../../types/index.js';

type ResponsavelListener = (responsaveis: Responsavel[]) => void;

let responsaveis: Responsavel[] = [];
let listeners: ResponsavelListener[] = [];

export async function carregarResponsaveis(): Promise<Responsavel[]> {
    responsaveis = await listarResponsaveis();
    notify();
    return responsaveis;
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