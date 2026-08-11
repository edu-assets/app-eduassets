import { getUsuario } from '../state/authStore.js';

export function isAdmin(): boolean {
    return getUsuario()?.nivelAcesso === 'ADMINISTRADOR';
}