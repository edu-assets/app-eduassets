import { describe, it, expect } from 'vitest';
import { html, raw } from '../core/utils/html.js';

describe('html tagged template', () => {
    it('escapa valores interpolados por padrão', () => {
        const nome = '<img src=x onerror=alert(1)>';
        const resultado = html`<span>${nome}</span>`;

        expect(resultado).toBe('<span>&lt;img src=x onerror=alert(1)&gt;</span>');
    });

    it('não escapa conteúdo marcado com raw()', () => {
        const resultado = html`<div>${raw('<b>negrito</b>')}</div>`;

        expect(resultado).toBe('<div><b>negrito</b></div>');
    });

    it('junta arrays de valores concatenando cada item formatado', () => {
        const itens = ['a', '<b>', 'c'];
        const resultado = html`<ul>${itens}</ul>`;

        expect(resultado).toBe('<ul>a&lt;b&gt;c</ul>');
    });

    it('trata null e undefined interpolados como string vazia', () => {
        const resultado = html`<span>${null}${undefined}</span>`;

        expect(resultado).toBe('<span></span>');
    });
});