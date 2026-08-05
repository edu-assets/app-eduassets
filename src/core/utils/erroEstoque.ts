import { ApiError } from '../api/index.js';

export function formatarErroEstoque(erro: unknown, fallback: string = 'Erro ao processar a solicitação.'): string {
    if (erro instanceof ApiError && Array.isArray(erro.payload?.itens) && erro.payload.itens.length) {
        const detalhes = erro.payload.itens
            .map((item: { nome: string; disponivel: number; solicitado: number }) =>
                `${item.nome} (disponível: ${item.disponivel}, solicitado: ${item.solicitado})`)
            .join('; ');
        return `Estoque insuficiente: ${detalhes}`;
    }

    return erro instanceof Error ? erro.message : fallback;
}