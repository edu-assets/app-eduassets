import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../core/utils/sanitize.js';

describe('escapeHtml', () => {
    it('escapa os cinco caracteres perigosos', () => {
        expect(escapeHtml(`<script>alert('xss')</script> & "aspas"`))
            .toBe('&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt; &amp; &quot;aspas&quot;');
    });

    it('retorna string vazia para null e undefined', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

    it('converte números e outros tipos para string antes de escapar', () => {
        expect(escapeHtml(42)).toBe('42');
        expect(escapeHtml(true)).toBe('true');
    });

    it('não altera texto sem caracteres especiais', () => {
        expect(escapeHtml('Notebook Multilaser')).toBe('Notebook Multilaser');
    });
});