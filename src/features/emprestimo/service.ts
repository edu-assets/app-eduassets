import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { addLoan } from '../../core/state/loanStore.js';
import { capacidade } from '../../core/state/disponibilidade.js';
import { adicionarOuIncrementarItem } from '../../core/utils/listaItens.js';
import { calcularDisponivelEfetivo } from '../../core/utils/estoque.js';
import type { Emprestimo, LoanDraft, LoanItemUI } from '../../types/index.js';
import { t } from '../../core/state/i18nStore.js';

export interface ResultadoAjusteItem {
    ok: boolean;
    itens: LoanItemUI[];
    erro?: string;
    /** Aviso (não bloqueia): a quantidade passa do que está disponível agora e exigirá agendamento. */
    aviso?: string;
}

export function adicionarItemComValidacao(
    itensAtuais: LoanItemUI[],
    novoItemBruto: LoanItemUI
): ResultadoAjusteItem {
    const novoItem: LoanItemUI = { ...novoItemBruto, quantidade: Math.max(1, Number(novoItemBruto.quantidade) || 1) };

    const equipamento = getEquipamentos().find((eq) => String(eq.id) === String(novoItem.id));
    const jaAdicionado = itensAtuais.find((item) => String(item.id) === String(novoItem.id))?.quantidade ?? 0;
    const capacidadeTotal = capacidade(equipamento);
    const disponivelAgora = calcularDisponivelEfetivo(equipamento);
    const pedido = jaAdicionado + novoItem.quantidade;

    // O limite é a capacidade (dá para agendar o que não está na prateleira agora).
    if (pedido > capacidadeTotal) {
        return {
            ok: false,
            itens: itensAtuais,
            erro: t('feedback.estoque_insuficiente_simples')
                .replace('{nome}', novoItem.nome)
                .replace('{disponivel}', String(capacidadeTotal))
        };
    }

    return {
        ok: true,
        itens: adicionarOuIncrementarItem(itensAtuais, novoItem),
        ...(pedido > disponivelAgora ? { aviso: textoDisponivelAgora(disponivelAgora) } : {})
    };
}

/** "Só 2 disponíveis agora." / "Nenhuma disponível agora." */
export function textoDisponivelAgora(disponivel: number): string {
    if (disponivel <= 0) return t('emprestimo.aviso_nenhuma_disponivel_agora');
    return t(disponivel === 1 ? 'emprestimo.aviso_disponivel_agora_singular' : 'emprestimo.aviso_disponivel_agora_plural')
        .replace('{n}', String(disponivel));
}

export async function registrarEmprestimo(dados: LoanDraft): Promise<Emprestimo> {
    if (!dados.itens.length) {
        throw new Error('validation.emprestimo.sem_itens');
    }
    return addLoan(dados);
}