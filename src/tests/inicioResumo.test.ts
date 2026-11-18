// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Equipamento, LoanUI, OcorrenciaUI } from '../types/index.js';

const dados = vi.hoisted(() => ({
    equipamentos: [] as Equipamento[],
    abertos: [] as LoanUI[],
    ocorrencias: [] as OcorrenciaUI[],
    status: { equipamentos: 'pronto', emprestimos: 'pronto', ocorrencias: 'pronto' } as Record<string, string>
}));

vi.mock('../core/state/equipamentoStore.js', () => ({ getEquipamentos: () => dados.equipamentos, subscribe: vi.fn() }));
vi.mock('../core/state/loanStore.js', () => ({ getLoansAbertos: () => dados.abertos, subscribe: vi.fn() }));
vi.mock('../core/state/ocorrenciasStore.js', () => ({ getOcorrencias: () => dados.ocorrencias, subscribe: vi.fn() }));
vi.mock('../core/state/loadStatus.js', () => ({
    getLoadStatus: (chave: string) => ({ status: dados.status[chave] }),
    subscribeLoadStatus: vi.fn()
}));

import { definirIdioma } from '../core/state/i18nStore.js';
import { calcularResumoOperacoes, renderResumoOperacoes, textosIndicadores } from '../features/inicio/resumo.js';

const eq = (id: number, modelo: string, total: number, disponivel: number): Equipamento =>
    ({ id, modelo, categoriaId: 1, quantidadeTotal: total, quantidadeDisponivel: disponivel, quantidadeQuebrada: 0, createdAt: '', updatedAt: '' });
const loan = (id: number, hora: string, itens: Array<[number, number]>): LoanUI =>
    ({ id, numero: id, aluno: 'A', responsavel: 'R', responsavelId: 1, status: 'aberto', data: '', dataDevolucao: null, observacao: '',
        createdAt: new Date(`2026-11-18T${hora}:00`), itens: itens.map(([i, quantidade]) => ({ id: i, quantidade })) } as unknown as LoanUI);
const oc = (id: number, tipo: string, status: 'aberto' | 'resolvidos' = 'aberto'): OcorrenciaUI =>
    ({ id, tipo, status, equipamentoId: 1 } as unknown as OcorrenciaUI);

function montarDom(): void {
    const card = (chave: string) => `<a class="inicio-resumo-card" data-resumo="${chave}">
        <span class="icon-badge inicio-resumo-icone"></span>
        <span data-resumo-numero>—</span><span data-resumo-unidade></span>
        <span class="inicio-resumo-status" data-estado="neutro"><span data-resumo-detalhe></span></span></a>`;
    document.body.innerHTML = `<section class="inicio-resumo" aria-busy="true"><span id="inicio-resumo-atualizado" hidden></span>
        ${['abertos', 'disponiveis', 'ocorrencias', 'estoque'].map(card).join('')}</section>`;
}
const card = (chave: string) => document.querySelector<HTMLElement>(`[data-resumo="${chave}"]`)!;
const texto = (chave: string, sel: string) => card(chave).querySelector(sel)!.textContent;

describe('resumo de operações do Início', () => {
    beforeEach(() => {
        definirIdioma('pt');
        dados.equipamentos = [eq(1, 'USB-C 20W', 10, 0), eq(2, 'Notebook', 20, 2), eq(3, 'Tablet', 10, 9)];
        dados.abertos = [loan(1, '10:30', [[2, 3]]), loan(2, '08:10', [[1, 2], [3, 1]])];
        dados.ocorrencias = [oc(1, 'manutencao'), oc(2, 'manutencao'), oc(3, 'quebrado'), oc(4, 'quebrado', 'resolvidos')];
        dados.status = { equipamentos: 'pronto', emprestimos: 'pronto', ocorrencias: 'pronto' };
        montarDom();
    });

    it('calcula os indicadores com as regras do Dashboard', () => {
        const r = calcularResumoOperacoes(dados.equipamentos, dados.abertos, dados.ocorrencias);
        expect(r.abertos.total).toBe(2);
        expect(r.abertos.maisAntigo?.getHours()).toBe(8);
        expect(r.estoque).toEqual({ disponivel: 11, total: 40, emprestado: 6 });
        expect(r.ocorrencias).toEqual({ abertas: 3, manutencao: 2, quebrado: 1, observacao: 0 });
        expect(r.alertas.esgotados.map((e) => e.modelo)).toEqual(['USB-C 20W']);
        expect(r.alertas.baixos.map((e) => e.modelo)).toEqual(['Notebook']);
    });

    it('preenche os cards com textos, estados e o horário do empréstimo mais antigo', () => {
        renderResumoOperacoes();
        expect(texto('abertos', '[data-resumo-numero]')).toBe('2');
        expect(texto('abertos', '[data-resumo-unidade]')).toBe('empréstimos');
        expect(texto('abertos', '[data-resumo-detalhe]')).toMatch(/^Mais antigo às 08:10$/);
        expect(texto('disponiveis', '[data-resumo-unidade]')).toBe('de 40 unidades');
        expect(texto('disponiveis', '[data-resumo-detalhe]')).toBe('6 emprestados · 28% livre');
        expect(texto('ocorrencias', '[data-resumo-detalhe]')).toBe('2 em manutenção · 1 quebrado');
        expect(card('ocorrencias').querySelector<HTMLElement>('.inicio-resumo-status')!.dataset.estado).toBe('alerta');
        expect(texto('estoque', '[data-resumo-detalhe]')).toBe('USB-C 20W esgotado · +1');
        expect(card('estoque').querySelector<HTMLElement>('.inicio-resumo-status')!.dataset.estado).toBe('erro');
        expect(card('estoque').querySelector('.inicio-resumo-icone')!.classList.contains('icon-badge--error')).toBe(true);
        expect(document.querySelector('.inicio-resumo')!.hasAttribute('aria-busy')).toBe(false);
        expect(document.getElementById('inicio-resumo-atualizado')!.hidden).toBe(false);
    });

    it('sem pendências: estados verdes e "Tudo certo"', () => {
        dados.equipamentos = [eq(1, 'Notebook', 10, 10)];
        dados.abertos = [];
        dados.ocorrencias = [];
        renderResumoOperacoes();
        expect(texto('abertos', '[data-resumo-detalhe]')).toBe('Nenhum empréstimo em aberto');
        expect(texto('ocorrencias', '[data-resumo-unidade]')).toBe('abertas');
        expect(texto('estoque', '[data-resumo-detalhe]')).toBe('Tudo certo');
        expect(card('estoque').querySelector('.inicio-resumo-icone')!.classList.contains('icon-badge--success')).toBe(true);
    });

    it('carga inicial: esqueleto; falha: "Indisponível no momento" sem quebrar os outros cards', () => {
        dados.status.emprestimos = 'carregando';
        dados.status.ocorrencias = 'erro';
        renderResumoOperacoes();
        expect(card('abertos').classList.contains('is-carregando')).toBe(true);
        expect(texto('abertos', '[data-resumo-numero]')).toBe('—');
        expect(texto('ocorrencias', '[data-resumo-detalhe]')).toBe('Indisponível no momento');
        expect(card('ocorrencias').classList.contains('is-carregando')).toBe(false);
        expect(texto('estoque', '[data-resumo-numero]')).toBe('2');
        expect(document.querySelector('.inicio-resumo')!.getAttribute('aria-busy')).toBe('true');
        expect(document.getElementById('inicio-resumo-atualizado')!.hidden).toBe(true);
    });

    it('textos seguem o idioma escolhido', () => {
        definirIdioma('en');
        const textos = textosIndicadores(calcularResumoOperacoes(dados.equipamentos, dados.abertos, dados.ocorrencias));
        expect(textos.disponiveis.detalhe).toBe('6 on loan · 28% free');
        expect(textos.estoque.detalhe).toBe('USB-C 20W out of stock · +1');
    });
});
