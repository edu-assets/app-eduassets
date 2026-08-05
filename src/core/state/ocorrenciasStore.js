import {
    listarOcorrencias,
    criarOcorrencia,
    atualizarOcorrencia,
    resolverOcorrencia,
    excluirOcorrencia
} from '../api/ocorrencias.js';

let ocorrencias = [];
let listeners = [];

export async function carregarOcorrencias() {
    const dados = await listarOcorrencias();
    ocorrencias = dados.map(mapOcorrencia);
    notify();
    return ocorrencias;
}

export function getOcorrencias() {
    return ocorrencias;
}

export function getOcorrenciasPorTipo(tipo) {
    return ocorrencias.filter((ocorrencia) => ocorrencia.tipo === tipo);
}

export async function addOcorrencia(dados) {
    await criarOcorrencia(dados);
    await carregarOcorrencias();
}

export async function updateOcorrencia(id, dados) {
    await atualizarOcorrencia(id, dados);
    await carregarOcorrencias();
}

export async function resolveOcorrencia(id, medidasTomadas) {
    await resolverOcorrencia(id, medidasTomadas);
    await carregarOcorrencias();
}

export async function deleteOcorrencia(id) {
    await excluirOcorrencia(id);
    await carregarOcorrencias();
}

export function subscribe(callback) {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function notify() {
    listeners.forEach((callback) => callback(ocorrencias));
}

function mapOcorrencia(ocorrencia) {
    const status = ocorrencia.status === 'RESOLVIDO' ? 'resolvidos' : 'aberto';

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