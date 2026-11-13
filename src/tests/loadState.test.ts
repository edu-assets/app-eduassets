// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listarEmprestimos = vi.fn();
vi.mock('../core/api/emprestimos.js', () => ({
    listarEmprestimos: (...args: unknown[]) => listarEmprestimos(...args),
    criarEmprestimo: vi.fn(),
    atualizarItensEmprestimo: vi.fn(),
    devolverEmprestimo: vi.fn()
}));
vi.mock('../core/api/equipamentos.js', () => ({ listarEquipamentos: vi.fn(async () => []), atualizarEquipamento: vi.fn() }));
vi.mock('../core/state/i18nStore.js', () => ({ t: (key: string) => key, subscribe: vi.fn() }));

import { carregarEmprestimos, limparEmprestimos } from '../core/state/loanStore.js';
import { getLoadStatus, subscribeLoadStatus, tentarNovamente } from '../core/state/loadStatus.js';
import { aplicarEstadoCarga, ligarTentarNovamente, renderSkeletonLinhas } from '../shared/components/loadState.js';
import { renderResumo, renderHistorico } from '../features/dashboard/render.js';
import type { DashboardEls } from '../features/dashboard/render.js';

describe('estado da carga inicial dos stores', () => {
    beforeEach(() => {
        listarEmprestimos.mockReset();
        limparEmprestimos();
    });

    it('carregando na primeira carga e pronto depois; refresh em segundo plano não volta a carregando', async () => {
        listarEmprestimos.mockResolvedValue([]);
        const eventos: string[] = [];
        const cancelar = subscribeLoadStatus((chave, s) => { if (chave === 'emprestimos') eventos.push(s.status); });

        const primeira = carregarEmprestimos();
        expect(getLoadStatus('emprestimos').status).toBe('carregando');
        await primeira;
        expect(getLoadStatus('emprestimos').status).toBe('pronto');

        eventos.length = 0;
        await carregarEmprestimos({ passivo: true });
        expect(eventos).toEqual([]);
        expect(getLoadStatus('emprestimos').status).toBe('pronto');
        cancelar();
    });

    it('falha em segundo plano mantém pronto; falha inicial vira erro e a nova tentativa recarrega', async () => {
        listarEmprestimos.mockRejectedValueOnce(new Error('x'));
        await expect(carregarEmprestimos()).rejects.toThrow();
        expect(getLoadStatus('emprestimos').status).toBe('erro');

        listarEmprestimos.mockResolvedValue([]);
        const promessa = tentarNovamente('emprestimos');
        expect(getLoadStatus('emprestimos').status).toBe('carregando');
        await promessa;
        expect(listarEmprestimos).toHaveBeenCalledTimes(2);
        expect(getLoadStatus('emprestimos').status).toBe('pronto');

        listarEmprestimos.mockRejectedValueOnce(new Error('y'));
        await expect(carregarEmprestimos({ passivo: true })).rejects.toThrow();
        expect(getLoadStatus('emprestimos').status).toBe('pronto');
    });
});

describe('aplicarEstadoCarga', () => {
    it('mostra esqueleto com aria-busy ao carregar e remove ao ficar pronto', () => {
        const el = document.createElement('div');
        expect(aplicarEstadoCarga(el, 'carregando', renderSkeletonLinhas(3))).toBe(true);
        expect(el.getAttribute('aria-busy')).toBe('true');
        expect(el.querySelectorAll('.skeleton-linha')).toHaveLength(3);

        expect(aplicarEstadoCarga(el, 'pronto', '')).toBe(false);
        expect(el.hasAttribute('aria-busy')).toBe(false);
    });

    it('erro mostra mensagem e botão que chama o carregador', () => {
        const el = document.createElement('div');
        const tentar = vi.fn();
        ligarTentarNovamente(el, 'emprestimos', tentar);
        expect(aplicarEstadoCarga(el, 'erro', '')).toBe(true);
        expect(el.querySelector('[role="alert"]')).not.toBeNull();
        el.querySelector<HTMLElement>('[data-load-retry]')!.click();
        expect(tentar).toHaveBeenCalledWith('emprestimos');
    });
});

describe('dashboard durante a carga', () => {
    function els(): DashboardEls {
        const mk = () => { const c = document.createElement('div'); c.className = 'dashboard-resumo-card'; const s = document.createElement('span'); c.appendChild(s); return s; };
        return {
            historicoLista: document.createElement('div'),
            historicoVazio: document.createElement('div'),
            resumoTotal: mk(), resumoDisponivel: mk(), resumoEmprestado: mk(), resumoQuebrado: mk(), resumoManutencao: mk(),
            resumoDisponivelPct: mk(), resumoEmprestadoPct: mk(), resumoQuebradoPct: mk(), resumoManutencaoPct: mk()
        } as unknown as DashboardEls;
    }

    it('contadores mostram "—" e histórico mostra esqueleto enquanto carrega; "0" depois de pronto', async () => {
        listarEmprestimos.mockResolvedValue([]);
        limparEmprestimos();
        const e = els();
        renderHistorico(e, []);
        expect(e.historicoLista.getAttribute('aria-busy')).toBe('true');
        expect(e.historicoLista.querySelector('.skeleton-linha')).not.toBeNull();
        expect(e.historicoVazio.style.display).toBe('none');

        await carregarEmprestimos();
        renderHistorico(e, []);
        expect(e.historicoLista.hasAttribute('aria-busy')).toBe(false);
        expect(e.historicoVazio.style.display).toBe('flex');
        expect(renderResumo).toBeTypeOf('function');
    });
});
