import { filtrarPorBusca } from '../../core/utils/busca.js';
import { html, raw } from '../../core/utils/html.js';
import { t } from '../../core/state/i18nStore.js';
import type { LoanUI } from '../../types/index.js';

export type OrdemDevolucoes = 'antigos' | 'recentes';

export interface FiltroDevolucoes {
    termo: string;
    ordem: OrdemDevolucoes;
}

export function criarFiltroDevolucoes(): FiltroDevolucoes {
    return { termo: '', ordem: 'antigos' };
}

function textoBusca(loan: LoanUI): string {
    return [
        loan.aluno,
        loan.responsavel,
        loan.criadoPor?.nome ?? '',
        ...loan.itens.map((item) => item.nome)
    ].join(' ');
}

/** Busca (solicitante, responsável, equipamento, "registrado por"; sem acento/caixa) e ordenação por data de criação. */
export function filtrarOrdenarDevolucoes(loans: LoanUI[], filtro: FiltroDevolucoes): LoanUI[] {
    const filtrados = filtrarPorBusca(loans, filtro.termo, textoBusca);
    const sinal = filtro.ordem === 'recentes' ? -1 : 1;
    return [...filtrados].sort((a, b) => sinal * ((a.createdAt.getTime() - b.createdAt.getTime()) || (a.id - b.id)));
}

export function renderDevolucoesFerramentas(filtro: FiltroDevolucoes): string {
    const opcao = (valor: OrdemDevolucoes, chave: string) =>
        html`<option value="${valor}"${raw(filtro.ordem === valor ? ' selected' : '')}>${t(chave)}</option>`;
    return html`
        <div class="controle-busca-wrap devolucao-busca-wrap">
            <span class="material-symbols-outlined">search</span>
            <input type="text" id="devolucao-busca" value="${filtro.termo}" placeholder="${t('devolucao.buscar_placeholder')}"
                aria-label="${t('devolucao.buscar_placeholder')}" autocomplete="off">
        </div>
        <select id="devolucao-ordem" class="devolucao-ordem" aria-label="${t('devolucao.ordenar')}">
            ${raw(opcao('antigos', 'devolucao.mais_antigos_primeiro'))}
            ${raw(opcao('recentes', 'devolucao.mais_recentes_primeiro'))}
        </select>
    `;
}

/**
 * Cria (uma vez) a barra de busca/ordenação acima da lista e liga os eventos. A barra fica fora da lista para que
 * a digitação sobreviva às re-renderizações (sincronização ao vivo). Os rótulos são refeitos em `atualizarRotulos`.
 */
export function montarFerramentasDevolucoes(
    lista: HTMLElement,
    filtro: FiltroDevolucoes,
    aoMudar: () => void
): { atualizarRotulos: () => void } {
    let barra = document.getElementById('devolucao-ferramentas');
    if (!barra) {
        barra = document.createElement('div');
        barra.id = 'devolucao-ferramentas';
        barra.className = 'devolucao-ferramentas';
        lista.parentElement?.insertBefore(barra, lista);
    }
    const alvo = barra;
    const desenhar = (): void => { alvo.innerHTML = renderDevolucoesFerramentas(filtro); };
    desenhar();
    alvo.addEventListener('input', (e) => {
        const el = e.target as HTMLElement;
        if (el.id !== 'devolucao-busca') return;
        filtro.termo = (el as HTMLInputElement).value;
        aoMudar();
    });
    alvo.addEventListener('change', (e) => {
        const el = e.target as HTMLElement;
        if (el.id !== 'devolucao-ordem') return;
        filtro.ordem = (el as HTMLSelectElement).value === 'recentes' ? 'recentes' : 'antigos';
        aoMudar();
    });
    // Limpar busca (botão do estado vazio) devolve o foco ao campo.
    lista.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('[data-limpar-busca]')) return;
        filtro.termo = '';
        const input = alvo.querySelector<HTMLInputElement>('#devolucao-busca');
        if (input) { input.value = ''; input.focus(); }
        aoMudar();
    });
    return {
        atualizarRotulos: () => {
            const tinhaFoco = document.activeElement?.id;
            desenhar();
            if (tinhaFoco) document.getElementById(tinhaFoco)?.focus();
        }
    };
}
