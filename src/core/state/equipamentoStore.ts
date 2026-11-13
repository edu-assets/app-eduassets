import { listarEquipamentos, atualizarEquipamento } from '../api/equipamentos.js';
import type { Equipamento, EquipamentoUpdatePayload } from '../../types/index.js';
import type { OpcoesLeitura } from '../api/apiClient.js';
import { iniciarCarga, concluirCarga, falharCarga, reiniciarCarga, registrarCarregador } from './loadStatus.js';
import { getSessionDataVersion } from './sessionDataVersion.js';
import { criarLeituraOrdenada, mesmoConteudo } from './leituraOrdenada.js';

type EquipamentoListener = (equipamentos: Equipamento[]) => void;

let equipamentos: Equipamento[] = [];
let listeners: EquipamentoListener[] = [];

const leituras = criarLeituraOrdenada();

export async function carregarEquipamentos(opcoes?: OpcoesLeitura): Promise<Equipamento[]> {
    const version = getSessionDataVersion();
    const leitura = leituras.iniciar();
    iniciarCarga('equipamentos');
    let dados: Awaited<ReturnType<typeof listarEquipamentos>>;
    try {
        dados = await listarEquipamentos(opcoes);
    } catch (erro) {
        if (version === getSessionDataVersion()) falharCarga('equipamentos');
        throw erro;
    }
    if (version !== getSessionDataVersion() || !leituras.podeAplicar(leitura)) return equipamentos;
    if (mesmoConteudo(dados, equipamentos)) {
        concluirCarga('equipamentos');
        return equipamentos;
    }
    equipamentos = dados;
    notify();
    concluirCarga('equipamentos');
    return equipamentos;
}

registrarCarregador('equipamentos', () => carregarEquipamentos());

export function limparEquipamentos(): void {
    reiniciarCarga('equipamentos');
    equipamentos = [];
    notify();
}

export function getEquipamentos(): Equipamento[] {
    return equipamentos;
}

export async function atualizarEquipamentoPorId(id: number, dados: EquipamentoUpdatePayload): Promise<void> {
    await atualizarEquipamento(id, dados);
    await carregarEquipamentos();
}

export function subscribe(callback: EquipamentoListener): () => void {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function notify(): void {
    listeners.forEach((callback) => callback(equipamentos));
}
