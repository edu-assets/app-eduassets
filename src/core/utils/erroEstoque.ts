import { ApiError } from '../api/index.js';
import { t, traduzirErro } from '../state/i18nStore.js';
import type { ItemEstoqueInsuficiente } from '../../types/index.js';

/** "Estoque insuficiente: Notebook (disponível: 1, solicitado: 3); ..." */
export function formatarItensEstoqueInsuficiente(itens: ItemEstoqueInsuficiente[]): string {
    const detalhes = itens
        .map((item) => t('feedback.estoque_insuficiente_item')
            .replace('{nome}', item.nome)
            .replace('{disponivel}', String(item.disponivel))
            .replace('{solicitado}', String(item.solicitado)))
        .join('; ');
    return t('feedback.estoque_insuficiente_detalhe').replace('{detalhes}', detalhes);
}

export function formatarErroEstoque(erro: unknown, chaveFallback: string = 'feedback.erro_processar_solicitacao'): string {
    if (erro instanceof ApiError && Array.isArray(erro.payload?.itens) && erro.payload.itens.length) {
        return formatarItensEstoqueInsuficiente(erro.payload.itens as ItemEstoqueInsuficiente[]);
    }

    return traduzirErro(erro, chaveFallback);
}