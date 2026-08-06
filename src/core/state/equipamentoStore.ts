import { listarEquipamentos, atualizarEquipamento } from '../api/equipamentos.js';
import type { Equipamento, EquipamentoUpdatePayload } from '../../types/index.js';

type EquipamentoListener = (equipamentos: Equipamento[]) => void;

let equipamentos: Equipamento[] = [];
let listeners: EquipamentoListener[] = [];

export async function carregarEquipamentos(): Promise<Equipamento[]> {
    equipamentos = await listarEquipamentos();
    notify();
    return equipamentos;
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