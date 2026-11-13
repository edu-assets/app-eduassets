// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoanUI } from '../types/index.js';

vi.hoisted(() => localStorage.setItem('eduassets_lang', 'pt'));

const mocks = vi.hoisted(() => ({
    filtros: {} as Record<string, string | undefined>,
    definir: vi.fn(),
    limpar: vi.fn(),
    historico: { items: [] as unknown[], nextCursor: null, filtros: {}, carregando: false, erro: null }
}));

vi.mock('../core/state/loanStore.js', () => ({
    getHistorico: () => mocks.historico,
    getFiltrosHistorico: () => mocks.filtros,
    definirFiltrosHistorico: mocks.definir,
    limparFiltrosHistorico: mocks.limpar,
    carregarMaisHistorico: vi.fn(),
    subscribe: () => () => undefined,
    subscribeHistorico: () => () => undefined,
    getLoansAbertos: () => []
}));
vi.mock('../core/state/authStore.js', () => ({
    isAutenticado: () => true,
    getUsuario: () => null,
    subscribe: () => () => undefined
}));
vi.mock('../core/state/equipamentoStore.js', () => ({
    getEquipamentos: () => [],
    subscribe: () => () => undefined
}));
vi.mock('../core/state/ocorrenciasStore.js', () => ({ subscribe: () => () => undefined }));

import { intervaloDoPeriodo, periodoAtivo, renderFiltrosHistorico } from '../features/dashboard/filtros.js';
import { attachDashboardEvents } from '../features/dashboard/events.js';
import { renderHistorico, renderEstoque } from '../features/dashboard/render.js';
import { filtrarOrdenarDevolucoes, criarFiltroDevolucoes } from '../features/devolucao/filtro.js';
import { renderDevolucaoSemResultados, renderDevolucaoEmptyState } from '../features/devolucao/templates.js';
import { renderEmptyStateSemResultados } from '../shared/components/emptyState.js';
import { renderListaRegistros } from '../features/cadastros/render.js';
import type { DashboardEls } from '../features/dashboard/render.js';

function loan(id: number, extra: Partial<LoanUI> = {}): LoanUI {
    return {
        id, numero: id, aluno: `Aluno ${id}`, responsavel: 'Maria', responsavelId: 1, status: 'aberto',
        data: '', dataDevolucao: null, observacao: '', createdAt: new Date(2026, 0, id), itens: [], ...extra
    };
}

describe('intervalos de período', () => {
    const hoje = new Date(2026, 10, 13, 15, 0);
    it('calcula de/ate locais', () => {
        expect(intervaloDoPeriodo('hoje', hoje)).toEqual({ de: '2026-11-13', ate: '2026-11-13' });
        expect(intervaloDoPeriodo('7dias', hoje)).toEqual({ de: '2026-11-07', ate: '2026-11-13' });
        expect(intervaloDoPeriodo('mes', hoje)).toEqual({ de: '2026-11-01', ate: '2026-11-13' });
        expect(intervaloDoPeriodo('tudo', hoje)).toEqual({ de: undefined, ate: undefined });
    });
    it('identifica o chip ativo', () => {
        expect(periodoAtivo({}, hoje)).toBe('tudo');
        expect(periodoAtivo({ de: '2026-11-13', ate: '2026-11-13' }, hoje)).toBe('hoje');
        expect(periodoAtivo({ de: '2026-01-01', ate: '2026-01-02' }, hoje)).toBeNull();
    });
    it('reflete estado e botão de limpar em aria-pressed', () => {
        const sem = renderFiltrosHistorico({}, hoje);
        expect(sem).not.toContain('data-filtro-limpar');
        const com = renderFiltrosHistorico({ status: 'ABERTO', q: 'x' }, hoje);
        expect(com).toContain('data-filtro-limpar');
        expect(com).toMatch(/data-filtro-valor="ABERTO" aria-pressed="true"/);
        expect(com).toMatch(/data-filtro-valor="TODOS" aria-pressed="false"/);
    });
});

describe('Dashboard: chips, limpar e estados vazios', () => {
    let els: DashboardEls;
    const estado = { termoBusca: '' };

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.filtros = {};
        mocks.definir.mockResolvedValue(undefined);
        mocks.limpar.mockResolvedValue(undefined);
        document.body.innerHTML = `
            <input id="busca"><div id="est"></div><div id="filtros"></div>
            <div id="lista"></div><div id="vazio"></div>`;
        const el = (id: string) => document.getElementById(id) as HTMLElement;
        els = {
            estoqueContainer: el('est'), historicoFiltros: el('filtros'), historicoLista: el('lista'),
            historicoVazio: el('vazio'), inputBusca: el('busca') as HTMLInputElement
        } as unknown as DashboardEls;
        estado.termoBusca = '';
        attachDashboardEvents(els, estado);
        renderHistorico(els, [], mocks.historico as never);
    });

    it('chips chamam definirFiltrosHistorico', () => {
        const clicar = (g: string, v: string) =>
            els.historicoFiltros!.querySelector<HTMLElement>(`[data-filtro-grupo="${g}"][data-filtro-valor="${v}"]`)!.click();
        clicar('status', 'DEVOLVIDO');
        expect(mocks.definir).toHaveBeenLastCalledWith({ status: 'DEVOLVIDO' });
        clicar('status', 'TODOS');
        expect(mocks.definir).toHaveBeenLastCalledWith({ status: undefined });
        clicar('periodo', 'hoje');
        expect(mocks.definir).toHaveBeenLastCalledWith(intervaloDoPeriodo('hoje'));
        clicar('periodo', 'tudo');
        expect(mocks.definir).toHaveBeenLastCalledWith({ de: undefined, ate: undefined });
    });

    it('limpar filtros limpa store e campo de busca', () => {
        mocks.filtros = { status: 'ABERTO' };
        els.inputBusca!.value = 'abc';
        estado.termoBusca = 'abc';
        renderHistorico(els, [], mocks.historico as never);
        els.historicoFiltros!.querySelector<HTMLElement>('[data-filtro-limpar]')!.click();
        expect(mocks.limpar).toHaveBeenCalled();
        expect(els.inputBusca!.value).toBe('');
        expect(estado.termoBusca).toBe('');
    });

    it('histórico vazio: sem filtros vs com busca (escapada) vs só filtros', () => {
        expect(els.historicoVazio.textContent).toContain('Nenhum empréstimo registrado ainda.');
        mocks.filtros = { q: '<b>x</b>' };
        renderHistorico(els, [], mocks.historico as never);
        expect(els.historicoVazio.querySelector('b')).toBeNull();
        expect(els.historicoVazio.textContent).toContain('Nenhum resultado para “<b>x</b>”');
        mocks.filtros = { status: 'ABERTO' };
        renderHistorico(els, [], mocks.historico as never);
        expect(els.historicoVazio.textContent).toContain('Nenhum resultado com os filtros atuais');
        els.historicoVazio.querySelector<HTMLElement>('[data-limpar-busca]')!.click();
        expect(mocks.limpar).toHaveBeenCalled();
    });

    it('estoque: nada cadastrado vs sem resultados com Limpar busca', () => {
        renderEstoque(els, []);
        expect(els.estoqueContainer.textContent).toContain('Nenhum equipamento cadastrado');
        renderEstoque(els, [], 'zzz');
        expect(els.estoqueContainer.textContent).toContain('Nenhum resultado para “zzz”');
        expect(els.estoqueContainer.querySelector('[data-limpar-busca]')).not.toBeNull();
    });
});

describe('Devoluções: busca e ordenação', () => {
    const base = [
        loan(1, { aluno: 'José', createdAt: new Date(2026, 0, 3) }),
        loan(2, { aluno: 'Ana', responsavel: 'Conceição', createdAt: new Date(2026, 0, 1), itens: [{ id: 5, nome: 'Projetor', quantidade: 1 }] }),
        loan(3, { aluno: 'Bia', createdAt: new Date(2026, 0, 2), criadoPor: { id: 9, nome: 'Zélia Admin' } })
    ];
    it('ordena (antigos é o padrão)', () => {
        expect(filtrarOrdenarDevolucoes(base, criarFiltroDevolucoes()).map((l) => l.id)).toEqual([2, 3, 1]);
        expect(filtrarOrdenarDevolucoes(base, { termo: '', ordem: 'recentes' }).map((l) => l.id)).toEqual([1, 3, 2]);
    });
    it('busca sem acento/caixa em todos os campos', () => {
        const ids = (termo: string) => filtrarOrdenarDevolucoes(base, { termo, ordem: 'antigos' }).map((l) => l.id);
        expect(ids('jose')).toEqual([1]);
        expect(ids('CONCEICAO')).toEqual([2]);
        expect(ids('projetor')).toEqual([2]);
        expect(ids('zelia')).toEqual([3]);
        expect(ids('nada')).toEqual([]);
    });
    it('estados vazios distintos', () => {
        expect(renderDevolucaoEmptyState()).not.toContain('data-limpar-busca');
        const sem = renderDevolucaoSemResultados('<i>');
        expect(sem).toContain('data-limpar-busca');
        expect(sem).not.toContain('<i>');
    });
});

describe('estado vazio compartilhado e Cadastros', () => {
    it('sem consulta fala de filtros atuais e usa Limpar filtros', () => {
        const out = renderEmptyStateSemResultados({ limpar: 'filtros' });
        expect(out).toContain('Nenhum resultado com os filtros atuais');
        expect(out).toContain('Limpar filtros');
    });
    it('cadastros: lista vazia com busca mostra sem resultados', () => {
        const listaWrap = document.createElement('div');
        renderListaRegistros({ listaWrap }, [], undefined, 'abc');
        expect(listaWrap.textContent).toContain('Nenhum resultado para “abc”');
        renderListaRegistros({ listaWrap }, [], undefined, '');
        expect(listaWrap.textContent).toContain('Nenhum registro cadastrado');
    });
});
