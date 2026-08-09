import { ApiError } from '../api/index.js';
import type { ItemEstoqueInsuficiente } from '../../types/index.js';

export function formatarErroEstoque(erro: unknown, fallback: string = 'Erro ao processar a solicitação.'): string {
    if (erro instanceof ApiError && Array.isArray(erro.payload?.itens) && erro.payload.itens.length) {
        const itens = erro.payload.itens as ItemEstoqueInsuficiente[];
        const detalhes = itens
            .map((item) => `${item.nome} (disponível: ${item.disponivel}, solicitado: ${item.solicitado})`)
            .join('; ');
        return `Estoque insuficiente: ${detalhes}`;
    }

    return erro instanceof Error ? erro.message : fallback;
}