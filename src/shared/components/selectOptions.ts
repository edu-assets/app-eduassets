import { html } from '../../core/utils/html.js';

export interface OpcaoSelecionavel {
    id: string | number;
    label: string;
    disabled?: boolean;
}

export function renderOpcaoSelect(opcao: OpcaoSelecionavel): string {
    return opcao.disabled
        ? html`<option value="${opcao.id}" disabled>${opcao.label}</option>`
        : html`<option value="${opcao.id}">${opcao.label}</option>`;
}

export function renderOpcoesSelect(opcoes: OpcaoSelecionavel[]): string {
    return opcoes.map(renderOpcaoSelect).join('');
}