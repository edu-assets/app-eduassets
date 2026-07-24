import { listarEquipamentos } from '../api/equipamentos.js';

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

export function subscribe(callback) {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function notify() {
    listeners.forEach((callback) => callback(equipamentos));
}