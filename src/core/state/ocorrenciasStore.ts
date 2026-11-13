import {
    listarOcorrencias,
    criarOcorrencia,
    atualizarOcorrencia,
    resolverOcorrencia,
    excluirOcorrencia
} from '../api/ocorrencias.js';
import type { Ocorrencia, OcorrenciaUI, OcorrenciaCreatePayload, OcorrenciaUpdatePayload } from '../../types/index.js';
import type { OpcoesLeitura } from '../api/apiClient.js';
import { getSessionDataVersion } from './sessionDataVersion.js';
import { carregarEquipamentos } from './equipamentoStore.js';
import { criarLeituraOrdenada, mesmoConteudo } from './leituraOrdenada.js';

type OcorrenciaListener = (ocorrencias: OcorrenciaUI[]) => void;

let ocorrencias: OcorrenciaUI[] = [];
let listeners: OcorrenciaListener[] = [];

const leituras = criarLeituraOrdenada();

export async function carregarOcorrencias(opcoes?: OpcoesLeitura): Promise<OcorrenciaUI[]> {
    const version = getSessionDataVersion();
    const leitura = leituras.iniciar();
    const dados = await listarOcorrencias(opcoes);
    if (version !== getSessionDataVersion() || !leituras.podeAplicar(leitura)) return ocorrencias;
    const novas = dados.map(mapOcorrencia);
    if (mesmoConteudo(novas, ocorrencias)) return ocorrencias;
    ocorrencias = novas;
    notify();
    return ocorrencias;
}

export function limparOcorrencias(): void {
    ocorrencias = [];
    notify();
}

export function getOcorrencias(): OcorrenciaUI[] {
    return ocorrencias;
}

export function getOcorrenciasPorTipo(tipo: string): OcorrenciaUI[] {
    return ocorrencias.filter((ocorrencia) => ocorrencia.tipo === tipo);
}

export async function addOcorrencia(dados: OcorrenciaCreatePayload): Promise<void> {
    await criarOcorrencia(dados);
    await recarregarAposMutacao();
}

export async function updateOcorrencia(id: number, dados: OcorrenciaUpdatePayload): Promise<void> {
    await atualizarOcorrencia(id, dados);
    await recarregarAposMutacao();
}

export async function resolveOcorrencia(id: number, medidasTomadas: string): Promise<void> {
    await resolverOcorrencia(id, medidasTomadas);
    await recarregarAposMutacao();
}

export async function deleteOcorrencia(id: number): Promise<void> {
    await excluirOcorrencia(id);
    await recarregarAposMutacao();
}

// Criar, resolver e excluir ocorrências alteram quantidadeQuebrada/disponível dos equipamentos no servidor.
async function recarregarAposMutacao(): Promise<void> {
    // A operação já foi aplicada: uma falha ao recarregar as listas não deve parecer falha do registro
    // (o usuário repetiria a ação); a sincronização ao vivo corrige em seguida.
    const resultados = await Promise.allSettled([carregarOcorrencias(), carregarEquipamentos()]);
    resultados.forEach((resultado) => {
        if (resultado.status === 'rejected') console.warn('[eduAssets] Falha ao recarregar após a operação:', resultado.reason);
    });
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
