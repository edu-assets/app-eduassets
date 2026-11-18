import { html, raw } from '../../core/utils/html.js';
import { getEquipamentoIcon } from '../../core/utils/equipamentoIcons.js';
import { gerarIniciais, formatarHora } from './utils.js';
import { renderEmptyState, renderEmptyStateSemResultados } from '../../shared/components/emptyState.js';
import { caminhoIlustracao } from '../../shared/components/kitVisual.js';
import { renderPessoaProtegida, renderIniciaisProtegidas } from '../../shared/components/restrictedPerson.js';
import { t } from '../../core/state/i18nStore.js';
import { isAcessoConvidadoAutorizado } from '../../core/state/authStore.js';
import { renderAutoriaCriador, envolverAutoria } from '../../shared/components/autoria.js';
import type { LoanItemUI, LoanUI } from '../../types/index.js';

const LIMITE_ICONES_CARD = 3;

export function renderDevolucaoEmptyState(): string {
    return renderEmptyState({
        containerClass: 'devolucao-vazia',
        imageSrc: caminhoIlustracao('tudoDevolvido'),
        imageClass: 'estado-ilustracao',
        titulo: t('devolucao.emprestimos_aparecerao_aqui'),
        tituloClass: 'devolucao-vazia-texto',
        subtitulo: t('devolucao.registre_um_novo_emprestimo_para_comecar'),
        subtituloClass: 'devolucao-vazia-sub'
    });
}

export function renderDevolucaoSemResultados(consulta: string): string {
    return renderEmptyStateSemResultados({
        consulta,
        limpar: 'busca',
        containerClass: 'devolucao-vazia',
        tituloClass: 'devolucao-vazia-texto'
    });
}

export function renderDevolucaoTabelaHeader(): string {
    return html`
        <div class="devolucao-tabela-header">
            <span>${t('devolucao.responsavel')}</span>
            <span>${t('devolucao.equipamentos')}</span>
            <span>${t('devolucao.emprestimo')}</span>
            <span>${t('devolucao.acoes')}</span>
        </div>
    `;
}

/** `title` com o texto completo quando a célula corta com reticências; omitido para convidados (dado restrito). */
function tituloSeVisivel(valor: string): string {
    return isAcessoConvidadoAutorizado() ? '' : html` title="${valor}"`;
}

export function renderDevolucaoCard(loan: LoanUI): string {
    const temObservacao = loan.observacao ? html`
        <span class="info-data-relativa">
            <span class="icon-badge icon-badge--sm icon-badge--neutral">
                <span class="material-symbols-outlined">sticky_note_2</span>
            </span>
            <span class="info-data-texto">${t('devolucao.com_observacao')}</span>
        </span>
    ` : '';

    return html`
        <div class="devolucao-item" data-id="${loan.id}">
            <div class="devolucao-col-resp">
                <div class="devolucao-avatar">${raw(renderIniciaisProtegidas(gerarIniciais(loan.responsavel)))}</div>
                <div class="devolucao-textos-resp">
                    <span class="info-resp-nome"${raw(tituloSeVisivel(loan.responsavel))}>${raw(renderPessoaProtegida(loan.responsavel))}</span>
                    <span class="info-aluno-nome"${raw(tituloSeVisivel(loan.aluno))}>${raw(renderPessoaProtegida(loan.aluno))}</span>
                    ${raw(envolverAutoria(renderAutoriaCriador(loan, 'autoria.registrado_por')))}
                </div>
            </div>
            <div class="devolucao-col-equip">
                <div class="devolucao-itens-icons">${raw(renderItensIcons(loan.itens))}</div>
            </div>
            <div class="devolucao-col-data">
                <span class="info-data-completa">
                    <span class="icon-badge icon-badge--sm icon-badge--neutral">
                        <span class="material-symbols-outlined">schedule</span>
                    </span>
                    ${formatarHora(loan.createdAt)}
                </span>
                ${raw(temObservacao)}
            </div>
            <div class="devolucao-col-acao">
                <button class="btn btn-primary btn-sm devolver-btn" data-id="${loan.id}" data-requires-auth>${t('devolucao.devolver')}</button>
                <button type="button" class="btn btn-neutral btn-sm detalhes-btn" data-id="${loan.id}">${t('dashboard.detalhes')}</button>
            </div>
        </div>
    `;
}

export function renderItensIcons(itens: LoanItemUI[]): string {
    if (itens.length <= LIMITE_ICONES_CARD) {
        return itens.map(renderItemIconPill).join('');
    }

    const visiveis = itens.slice(0, LIMITE_ICONES_CARD - 1);
    const restantes = itens.length - visiveis.length;

    return visiveis.map(renderItemIconPill).join('') +
        `<div class="devolucao-item-icon-pill devolucao-item-icon-mais" title="+${restantes} ${restantes > 1 ? t('devolucao.itens') : t('devolucao.item')}">...</div>`;
}

export function renderItemIconPill(item: LoanItemUI): string {
    return html`
        <div class="devolucao-item-icon-pill" data-eq="${item.id}" title="${item.quantidade}x ${item.nome}">
            <span class="icon-badge icon-badge--sm icon-badge--primary">
                <span class="material-symbols-outlined">${getEquipamentoIcon(item.id)}</span>
            </span>
            <span class="devolucao-item-icon-pill-texto">${item.quantidade}x ${item.nome}</span>
        </div>
    `;
}

export function renderDetalheItensView(itens: LoanItemUI[]): string {
    return itens.map((item) => html`
        <li>
            <span class="icon-badge icon-badge--sm icon-badge--primary">
                <span class="material-symbols-outlined">${getEquipamentoIcon(item.id)}</span>
            </span>
            <span class="detalhe-item-nome" title="${item.quantidade}x ${item.nome}">${item.quantidade}x ${item.nome}</span>
            <span class="detalhe-item-status">${t('devolucao.pendente')}</span>
        </li>
    `).join('');
}

export function renderDetalheItensEdit(itens: LoanItemUI[]): string {
    return itens.map((item) => html`
        <li class="detalhe-emprestimo-item-edit">
            <input type="number" min="1" class="detalhe-item-qtd" value="${item.quantidade}" data-id="${item.id}">
            <span class="detalhe-item-nome" title="${item.nome}">${item.nome}</span>
            <button type="button" class="item-emprestimo-remover detalhe-item-remover" data-id="${item.id}" aria-label="${t('devolucao.remover')}: ${item.nome}" title="${t('devolucao.remover')}">
                <span class="material-symbols-outlined">close</span>
            </button>
        </li>
    `).join('');
}

export function renderDetalheObservacao(observacao: string | null | undefined): string {
    if (!observacao) return '';
    return html`<span class="detalhe-emprestimo-obs-label">${t('devolucao.observacao')}</span><p>${observacao}</p>`;
}
