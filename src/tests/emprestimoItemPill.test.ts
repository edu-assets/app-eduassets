// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

vi.mock('../core/state/i18nStore.js', () => ({
    t: (key: string) => ({ 'devolucao.remover': 'Remover' } as Record<string, string>)[key] ?? key
}));
vi.mock('../core/state/equipamentoStore.js', () => ({ getEquipamentos: () => [{ id: 7, modelo: 'Notebook Dell <b>', categoria: { nome: 'Notebook' } }] }));
vi.mock('../core/utils/equipamentoIcons.js', () => ({ getEquipamentoIcon: () => 'laptop' }));

import { renderItemRow } from '../features/emprestimo/templates.js';

describe('renderItemRow', () => {
    it('renders a compact single-line pill with icon, truncated name, quantity and labelled remove button', () => {
        const host = document.createElement('div');
        host.innerHTML = renderItemRow({ id: 7, nome: 'Notebook Dell <b>', quantidade: 2 });
        const row = host.querySelector('.item-emprestimo-row') as HTMLElement;
        expect(row.title).toBe('2x Notebook Dell <b> — Notebook');
        expect(row.querySelector('.item-emprestimo-icone')?.textContent).toBe('laptop');
        expect(row.querySelector('.item-emprestimo-qtd')?.textContent).toBe('2x');
        expect(row.querySelector('.item-emprestimo-nome')?.textContent).toBe('Notebook Dell <b>');
        const btn = row.querySelector('.item-emprestimo-remover') as HTMLElement;
        expect(btn.dataset.id).toBe('7');
        expect(btn.getAttribute('aria-label')).toBe('Remover: 2x Notebook Dell <b> — Notebook');
    });
});
