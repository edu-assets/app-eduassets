import {
    listarOcorrencias,
    criarOcorrencia,
    atualizarOcorrencia,
    resolverOcorrencia,
    excluirOcorrencia
} from '../api/ocorrencias.js';
import type { Ocorrencia, OcorrenciaUI, OcorrenciaCreatePayload, OcorrenciaUpdatePayload } from '../../types/index.js';

type OcorrenciaListener = (ocorrencias: OcorrenciaUI[]) => void;

let ocorrencias: OcorrenciaUI[] = [];
let listeners: OcorrenciaListener[] = [];

export async function carregarOcorrencias(): Promise<OcorrenciaUI[]> {
    const dados = await listarOcorrencias();
    ocorrencias = dados.map(mapOcorrencia);
    notify();
    return ocorrencias;
}

export function getOcorrencias(): OcorrenciaUI[] {
    return ocorrencias;
}

export function getOcorrenciasPorTipo(tipo: string): OcorrenciaUI[] {
    return ocorrencias.filter((ocorrencia) => ocorrencia.tipo === tipo);
}

export async function addOcorrencia(dados: OcorrenciaCreatePayload): Promise<void> {
    await criarOcorrencia(dados);
    await carregarOcorrencias();
}

export async function updateOcorrencia(id: number, dados: OcorrenciaUpdatePayload): Promise<void> {
    await atualizarOcorrencia(id, dados);
    await carregarOcorrencias();
}

export async function resolveOcorrencia(id: number, medidasTomadas: string): Promise<void> {
    await resolverOcorrencia(id, medidasTomadas);
    await carregarOcorrencias();
}

export async function deleteOcorrencia(id: number): Promise<void> {
    await excluirOcorrencia(id);
    await carregarOcorrencias();
}

export function subscribe(callback: OcorrenciaListener): () => void {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function notify(): void {
    listeners.forEach((callback) => callback(ocorrencias));
}

function mapOcorrencia(ocorrencia: Ocorrencia): OcorrenciaUI {
    const status: OcorrenciaUI['status'] = ocorrencia.status === 'RESOLVIDO' ? 'resolvidos' : 'aberto';

    return {
        id: ocorrencia.id,
        equipamentoId: ocorrencia.equipamentoId,
        tipo: status === 'resolvidos' ? 'resolvidos' : String(ocorrencia.tipo ?? '').toLowerCase(),
        status,
        categoria: ocorrencia.equipamento?.categoria?.nome ?? '',
        modelo: ocorrencia.equipamento?.modelo ?? '',
        numero: ocorrencia.numero ?? '',
        problema: ocorrencia.problema ?? '',
        descricao: ocorrencia.descricao ?? '',
        registradoEm: new Date(ocorrencia.createdAt).toLocaleString('pt-BR'),
        resolvidoEm: ocorrencia.resolvidoEm ? new Date(ocorrencia.resolvidoEm).toLocaleString('pt-BR') : '',
        medidas: ocorrencia.medidasTomadas ?? ''
    };
}