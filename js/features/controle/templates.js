import { html, raw } from '../../core/utils/html.js';
import { renderEmptyState } from '../../shared/components/emptyState.js';

const PROBLEMA_ICONS = {
    tela: { label: 'Tela', icon: 'monitor' },
    audio: { label: 'Áudio', icon: 'headphones' },
    bateria: { label: 'Bateria', icon: 'battery_alert' },
    cabo: { label: 'Cabo', icon: 'cable' },
    touch: { label: 'Touch', icon: 'touch_app' },
    teclado: { label: 'Teclado', icon: 'keyboard' },
    botao: { label: 'Botão', icon: 'smart_button' },
    carcaca: { label: 'Carcaça', icon: 'construction' },
    outro: { label: 'Outro', icon: 'help' }
};

export const ICONE_POR_TIPO = {
    observacao: 'chat_bubble',
    manutencao: 'build',
    quebrado: 'heart_broken',
    resolvidos: 'task_alt'
};

export function renderControleMenuAcoes(tipo) {
    const opcaoResolver = (tipo === 'manutencao' || tipo === 'quebrado')
        ? html`<span class="registros-row-menu-opcao" data-acao="resolver" data-requires-auth>Resolver</span>`
        : '';

    return html`
        <span class="registros-row-menu-wrap">
            <button type="button" class="registros-row-menu-btn" aria-label="Mais opções">
                <span class="material-symbols-outlined">more_vert</span>
            </button>
            <div class="registros-row-menu">
                ${raw(opcaoResolver)}
                <span class="registros-row-menu-opcao" data-acao="editar"data-requires-auth>Editar</span>
                <span class="registros-row-menu-opcao registros-row-menu-opcao-danger" data-acao="excluir"data-requires-auth>Excluir</span>
            </div>
        </span>
    `;
}

export function renderControleLinha(tipo, dados) {
    const problemaInfo = PROBLEMA_ICONS[dados.problema] || PROBLEMA_ICONS.outro;
    const iconeLinha = ICONE_POR_TIPO[tipo] || 'chat_bubble';
    const ehResolvido = tipo === 'resolvidos';
    const dataTexto = ehResolvido ? (dados.resolvidoEm || dados.registradoEm) : dados.registradoEm;

    const colunaMedidas = ehResolvido
        ? html`<span data-col="medidas">${dados.medidas || '—'}</span>`
        : '';

    return html`
        <div class="${ehResolvido ? 'registros-row registros-row-resolvidos' : 'registros-row'}" data-id="${dados.id}" data-equipamento-id="${dados.equipamentoId}"
            data-tipo="${tipo}" data-status="${dados.status}" data-problema="${dados.problema}" data-categoria="${dados.categoria}"
            data-modelo="${dados.modelo}" data-numero="${dados.numero}" data-descricao="${dados.descricao}"
            data-registrado-em="${dataTexto}"${ehResolvido ? ` data-medidas="${dados.medidas || ''}"` : ''}>
        <span class="registros-row-icon"><span class="material-symbols-outlined">${iconeLinha}</span></span>
        <span data-col="categoria">${dados.categoria}</span>
        <span data-col="modelo">${dados.modelo}</span>
        <span class="registros-numero" data-col="numero">${dados.numero}</span>
        <span class="controle-problema-badge"><span class="material-symbols-outlined">${problemaInfo.icon}</span>${problemaInfo.label}</span>
        <span data-col="descricao">${dados.descricao}</span>
        <span class="registros-data" data-col="registrado-em">${dataTexto}</span>
        ${raw(colunaMedidas)}
        ${raw(renderControleMenuAcoes(tipo))}
        </div>
    `;
}

export function renderControleEmptyState() {
    return renderEmptyState({
        containerClass: 'controle-empty-state',
        icon: 'inbox',
        titulo: 'Nenhum registro encontrado.'
    });
}