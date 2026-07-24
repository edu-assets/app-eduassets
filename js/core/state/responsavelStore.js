import { listarResponsaveis } from '../api/responsaveis.js';

let responsaveis = [];
let listeners = [];

export async function carregarResponsaveis() {
    responsaveis = await listarResponsaveis();
    notify();
    return responsaveis;
}

export function getResponsaveis() {
    return responsaveis;
}

export function subscribe(callback) {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function notify() {
    listeners.forEach((callback) => callback(responsaveis));
}