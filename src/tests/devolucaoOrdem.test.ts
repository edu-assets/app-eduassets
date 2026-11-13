// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

vi.mock('../core/state/i18nStore.js', () => ({ t: (key: string) => key }));

import { criarFiltroDevolucoes, montarFerramentasDevolucoes } from '../features/devolucao/filtro.js';

describe('ordenação de devoluções (controle segmentado)', () => {
    it('expõe botões com aria-pressed e troca a ordem ao clicar', () => {
        document.body.innerHTML = '<div><div id="lista"></div></div>';
        const filtro = criarFiltroDevolucoes();
        const aoMudar = vi.fn();
        montarFerramentasDevolucoes(document.getElementById('lista') as HTMLElement, filtro, aoMudar);
        const grupo = document.getElementById('devolucao-ordem') as HTMLElement;
        expect(grupo.getAttribute('role')).toBe('group');
        expect(grupo.querySelector('[data-ordem="antigos"]')?.getAttribute('aria-pressed')).toBe('true');
        (grupo.querySelector('[data-ordem="recentes"]') as HTMLElement).click();
        expect(filtro.ordem).toBe('recentes');
        expect(aoMudar).toHaveBeenCalledTimes(1);
        const novo = document.getElementById('devolucao-ordem') as HTMLElement;
        expect(novo.querySelector('[data-ordem="recentes"]')?.getAttribute('aria-pressed')).toBe('true');
        expect(novo.querySelector('[data-ordem="antigos"]')?.getAttribute('aria-pressed')).toBe('false');
    });
});
