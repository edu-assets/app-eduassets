import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { addLoan } from '../../core/state/loanStore.js';
import { adicionarOuIncrementarItem } from '../../core/utils/listaItens.js';
import { calcularDisponivelEfetivo } from '../../core/utils/estoqueDisponivel.js';
import type { LoanDraft, LoanItemUI } from '../../types/index.js';
import { t } from '../../core/state/i18nStore.js';

export interface ResultadoAjusteItem {
    ok: boolean;
    itens: LoanItemUI[];
    erro?: string;
}

export function adicionarItemComValidacao(
    itensAtuais: LoanItemUI[],
    novoItemBruto: LoanItemUI
): ResultadoAjusteItem {
    const novoItem: LoanItemUI = { ...novoItemBruto, quantidade: Math.max(1, Number(novoItemBruto.quantidade) || 1) };

    const equipamento = getEquipamentos().find((eq) => String(eq.id) === String(novoItem.id));
    const jaAdicionado = itensAtuais.find((item) => String(item.id) === String(novoItem.id))?.quantidade ?? 0;
    const disponivelEfetivo = calcularDisponivelEfetivo(equipamento);

    if (jaAdicionado + novoItem.quantidade > disponivelEfetivo) {
        return {
            ok: false,
            itens: itensAtuais,
            erro: t('feedback.estoque_insuficiente_simples')
                .replace('{nome}', novoItem.nome)
                .replace('{disponivel}', String(disponivelEfetivo))
        };
    }

    return { ok: true, itens: adicionarOuIncrementarItem(itensAtuais, novoItem) };
}

export async function registrarEmprestimo(dados: LoanDraft): Promise<void> {
    if (!dados.itens.length) {
        throw new Error('validation.emprestimo.sem_itens');
    }
    await addLoan(dados);
}