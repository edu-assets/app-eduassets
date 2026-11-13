import { subscribe, isAutenticado, getUsuario } from './authStore.js';

function chave(autenticado: boolean, usuarioId: unknown): string {
    return autenticado ? `u:${String(usuarioId ?? '')}` : 'guest';
}

/**
 * Chama `callback` quando a sessão muda de dono: logout (explícito ou por expiração), login ou troca de usuário.
 * Atualizações só de perfil (mesmo id) não disparam. Retorna a função de cancelamento.
 */
export function aoTrocarSessao(callback: () => void): () => void {
    let atual = chave(isAutenticado(), getUsuario()?.id);
    return subscribe(({ autenticado, usuario }) => {
        const nova = chave(autenticado, usuario?.id);
        if (nova === atual) return;
        atual = nova;
        callback();
    });
}
