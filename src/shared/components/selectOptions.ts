import { html } from '../../core/utils/html.js';

export interface OpcaoSelecionavel {
    id: string | number;
    label: string;
}

export function renderOpcaoSelect(opcao: OpcaoSelecionavel): string {
    return html`<option value="${opcao.id}">${opcao.label}</option>`;
}

export function renderOpcoesSelect(opcoes: OpcaoSelecionavel[]): string {
    return opcoes.map(renderOpcaoSelect).join('');
}