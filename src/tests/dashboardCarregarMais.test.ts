// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { LoanUI } from '../types/index.js';

vi.hoisted(() => localStorage.setItem('eduassets_lang', 'pt'));

vi.mock('../core/state/loanStore.js', () => ({
    getFiltrosHistorico: () => ({}),
    getHistorico: () => ({ items: [], nextCursor: null, filtros: {}, carregando: false, erro: null }),
    getLoansAbertos: () => []
}));
vi.mock('../core/state/equipamentoStore.js', () => ({ getEquipamentos: () => [] }));

import { renderHistorico } from '../features/dashboard/render.js';
import type { DashboardEls } from '../features/dashboard/render.js';

describe('Dashboard: botão "Carregar mais"', () => {
    it('carregando usa setButtonLoading (rótulo preservado, sem troca de texto) e volta ao normal', () => {
        document.body.innerHTML = `
            <div id="lista"></div><div id="vazio"></div>
            <div id="pag" hidden><span id="cont"></span><button id="mais" class="btn" hidden>Carregar mais</button></div>`;
        const el = (id: string) => document.getElementById(id) as HTMLElement;
        const els = {
            historicoLista: el('lista'), historicoVazio: el('vazio'),
            historicoPaginacao: el('pag'), historicoContagem: el('cont'),
            btnCarregarMais: el('mais') as HTMLButtonElement
        } as unknown as DashboardEls;
        const loan = { id: 1, numero: 1, itens: [] } as unknown as LoanUI;
        const estado = (carregando: boolean) => ({ items: [loan], nextCursor: 'x', filtros: {}, carregando, erro: null });

        renderHistorico(els, [loan], estado(true) as never);
        expect(els.btnCarregarMais!.classList.contains('is-loading')).toBe(true);
        expect(els.btnCarregarMais!.disabled).toBe(true);
        expect(els.btnCarregarMais!.querySelector('.btn-spinner')).not.toBeNull();
        expect(els.btnCarregarMais!.querySelector('.btn-label')?.textContent).toBe('Carregar mais');

        renderHistorico(els, [loan], estado(false) as never);
        expect(els.btnCarregarMais!.classList.contains('is-loading')).toBe(false);
        expect(els.btnCarregarMais!.disabled).toBe(false);
        expect(els.btnCarregarMais!.querySelector('.btn-spinner')).toBeNull();
        expect(els.btnCarregarMais!.textContent).toBe('Carregar mais');
    });
});
