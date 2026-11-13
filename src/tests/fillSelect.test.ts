// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { fillSelect, renderPlaceholderOption } from '../shared/dom/fillSelect.js';

const placeholder = renderPlaceholderOption('Selecionar');
const opcoes = (...ids: number[]) => ids.map((id) => `<option value="${id}">Item ${id}</option>`).join('');

describe('fillSelect', () => {
    let select: HTMLSelectElement;

    beforeEach(() => {
        document.body.innerHTML = '<select id="s"></select>';
        select = document.getElementById('s') as HTMLSelectElement;
    });

    it('starts on the placeholder when nothing was selected', () => {
        fillSelect(select, placeholder, opcoes(1, 2));
        expect(select.value).toBe('');
        expect(select.options).toHaveLength(3);
    });

    it('keeps the user selection when the list is re-rendered', () => {
        fillSelect(select, placeholder, opcoes(1, 2, 3));
        select.value = '2';

        fillSelect(select, placeholder, opcoes(1, 2, 3, 4));

        expect(select.value).toBe('2');
        expect(select.options).toHaveLength(5);
    });

    it('falls back to the placeholder when the selected option no longer exists', () => {
        fillSelect(select, placeholder, opcoes(1, 2, 3));
        select.value = '3';

        fillSelect(select, placeholder, opcoes(1, 2));

        expect(select.value).toBe('');
    });
});
