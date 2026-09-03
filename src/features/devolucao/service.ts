import { returnLoan, updateLoan } from '../../core/state/loanStore.js';
import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { calcularDisponivelEfetivo } from '../../core/utils/estoque.js';
import { adicionarOuIncrementarItem, removerItemPorId, atualizarQuantidadeItem } from '../../core/utils/listaItens.js';
import type { LoanItemUI } from '../../types/index.js';
import { t } from '../../core/state/i18nStore.js';

export { removerItemPorId };

export interface ResultadoAjusteItem {
    ok: boolean;
    itens: LoanItemUI[];
    erro?: string;
}

export function adicionarItemDetalheComValidacao(
    itensAtuais: LoanItemUI[],
    itensOriginais: LoanItemUI[],
    novoItemBruto: LoanItemUI
): ResultadoAjusteItem {
    const novoItem: LoanItemUI = { ...novoItemBruto, quantidade: Math.max(1, Number(novoItemBruto.quantidade) || 1) };

    const equipamento = getEquipamentos().find((eq) => String(eq.id) === String(novoItem.id));
    const reservadoOriginal = itensOriginais.find((item) => String(item.id) === String(novoItem.id))?.quantidade ?? 0;
    const jaNoRascunho = itensAtuais.find((item) => String(item.id) === String(novoItem.id))?.quantidade ?? 0;
    const disponivelEfetivo = calcularDisponivelEfetivo(equipamento, reservadoOriginal);

    if (jaNoRascunho + novoItem.quantidade > disponivelEfetivo) {
        return {
            ok: false,
            itens: itensAtuais,
            erro: t('feedback.estoque_insuficiente_com_reservado')
                .replace('{nome}', novoItem.nome)
                .replace('{disponivel}', String(disponivelEfetivo))
                .replace('{reservado}', String(jaNoRascunho))
        };
    }

    return { ok: true, itens: adicionarOuIncrementarItem(itensAtuais, novoItem) };
}

export function atualizarQuantidadeComValidacao(
    itensAtuais: LoanItemUI[],
    itensOriginais: LoanItemUI[],
    id: string | number,
    quantidadeDesejada: number
): ResultadoAjusteItem {
    const equipamento = getEquipamentos().find((eq) => String(eq.id) === String(id));
    const reservadoOriginal = itensOriginais.find((item) => String(item.id) === String(id))?.quantidade ?? 0;
    const disponivelEfetivo = calcularDisponivelEfetivo(equipamento, reservadoOriginal);
    const quantidadeValida = Math.max(1, Number(quantidadeDesejada) || 1);

    if (quantidadeValida > disponivelEfetivo) {
        return {
            ok: false,
            itens: itensAtuais,
            erro: t('feedback.estoque_insuficiente_quantidade').replace('{disponivel}', String(disponivelEfetivo))
        };
    }

    return { ok: true, itens: atualizarQuantidadeItem(itensAtuais, id, quantidadeValida) };
}

export async function confirmarDevolucao(id: number): Promise<void> {
    await returnLoan(id);
}

export async function salvarItensEmprestimo(id: number, itens: LoanItemUI[]): Promise<void> {
    if (!itens.length) {
        throw new Error('devolucao.emprestimo_precisa_item');
    }
    await updateLoan(id, { itens });
}