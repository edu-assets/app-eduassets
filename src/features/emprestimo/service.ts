import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { addLoan } from '../../core/state/loanStore.js';
import { adicionarOuIncrementarItem } from '../../core/utils/listaItens.js';
import { calcularDisponivelEfetivo } from '../../core/utils/estoqueDisponivel.js';
import type { LoanDraft, LoanItemUI } from '../../types/index.js';

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
            erro: `Estoque insuficiente: ${novoItem.nome} (disponível: ${disponivelEfetivo})`
        };
    }

    return { ok: true, itens: adicionarOuIncrementarItem(itensAtuais, novoItem) };
}

export async function registrarEmprestimo(dados: LoanDraft): Promise<void> {
    if (!dados.itens.length) {
        throw new Error('Adicione ao menos um equipamento ao empréstimo');
    }

    await addLoan(dados);
}