import { listarEquipamentos, atualizarEquipamento } from '../api/equipamentos.js';

let equipamentos = [];
let listeners = [];

export async function carregarEquipamentos() {
    equipamentos = await listarEquipamentos();
    notify();
    return equipamentos;
}

export function getEquipamentos() {
    return equipamentos;
}

export async function atualizarEquipamentoPorId(id, dados) {
    await atualizarEquipamento(id, dados);
    await carregarEquipamentos();
}

export function subscribe(callback) {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function notify() {
    listeners.forEach((callback) => callback(equipamentos));
}