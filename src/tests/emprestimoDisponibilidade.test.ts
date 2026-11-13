// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const equipamentos = [
    { id: 1, modelo: 'Notebook', categoria: { nome: 'Informática' }, quantidadeDisponivel: 3 },
    { id: 2, modelo: 'Projetor', categoria: { nome: 'Áudio e vídeo' }, quantidadeDisponivel: 0 }
];

vi.mock('../core/state/i18nStore.js', () => ({
    getIdioma: () => 'pt', formatarDataHora: (v: unknown) => (typeof v === 'string' ? v : ''), getLocale: () => 'pt-BR',
    t: (key: string) => ({
        'emprestimo.disponivel_singular': '{n} disponível',
        'emprestimo.disponivel_plural': '{n} disponíveis',
        'emprestimo.quantidade_maxima': 'Máximo: {max}',
        'emprestimo.sem_unidades_disponiveis': 'Sem unidades',
        'dashboard.detalhes': 'Detalhes',
        'devolucao.devolver': 'Devolver'
    } as Record<string, string>)[key] ?? key,
    traduzirErro: () => ''
}));
vi.mock('../core/state/equipamentoStore.js', () => ({
    getEquipamentos: () => equipamentos,
    subscribe: () => () => undefined
}));

import { popularSelectEquipamentos, disponivelRestante } from '../features/emprestimo/render.js';
import { atualizarLimiteQuantidade, attachEmprestimoEvents } from '../features/emprestimo/events.js';
import { renderDevolucaoCard } from '../features/devolucao/templates.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eqs = equipamentos as any[];

describe('disponibilidade no empréstimo', () => {
    let select: HTMLSelectElement;
    let qtd: HTMLInputElement;

    beforeEach(() => {
        document.body.innerHTML = `
            <form id="f"><select id="equipamento"></select>
            <input id="quantidade" type="number" value="1"><span id="quantidade-erro" hidden></span>
            <textarea id="observacao" maxlength="250"></textarea><span id="observacao-contador">0/250</span></form>`;
        select = document.getElementById('equipamento') as HTMLSelectElement;
        qtd = document.getElementById('quantidade') as HTMLInputElement;
    });

    it('mostra disponíveis na opção e desabilita as sem estoque', () => {
        popularSelectEquipamentos(select, eqs, []);
        const opts = Array.from(select.options);
        expect(opts[1].text).toBe('Notebook — Informática (3 disponíveis)');
        expect(opts[1].disabled).toBe(false);
        expect(opts[2].text).toContain('(0 disponíveis)');
        expect(opts[2].disabled).toBe(true);
    });

    it('desconta itens já adicionados e preserva a seleção', () => {
        popularSelectEquipamentos(select, eqs, []);
        select.value = '1';
        popularSelectEquipamentos(select, eqs, [{ id: '1', nome: 'Notebook', quantidade: 2 }]);
        expect(select.value).toBe('1');
        expect(select.options[1].text).toContain('(1 disponível)');
        expect(disponivelRestante(eqs[0], [{ id: '1', nome: 'x', quantidade: 3 }])).toBe(0);
    });

    it('define max e mostra erro inline acessível ao exceder', () => {
        popularSelectEquipamentos(select, eqs, []);
        select.value = '1';
        atualizarLimiteQuantidade({ equipamentoSelect: select, quantidadeInput: qtd }, { itens: [] });
        expect(qtd.max).toBe('3');
        expect(qtd.hasAttribute('aria-invalid')).toBe(false);

        qtd.value = '5';
        atualizarLimiteQuantidade({ equipamentoSelect: select, quantidadeInput: qtd }, { itens: [] });
        const erro = document.getElementById('quantidade-erro') as HTMLElement;
        expect(qtd.getAttribute('aria-invalid')).toBe('true');
        expect(erro.hidden).toBe(false);
        expect(erro.textContent).toBe('Máximo: 3');

        qtd.value = '2';
        atualizarLimiteQuantidade({ equipamentoSelect: select, quantidadeInput: qtd }, { itens: [] });
        expect(qtd.hasAttribute('aria-invalid')).toBe(false);
        expect(erro.hidden).toBe(true);
    });

    it('contador da observação acompanha a digitação', () => {
        const form = document.getElementById('f') as HTMLFormElement;
        const obs = document.getElementById('observacao') as HTMLTextAreaElement;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const els: any = {
            form, equipamentoSelect: select, quantidadeInput: qtd, observacaoInput: obs,
            btnAdicionar: document.createElement('button'), itensList: document.createElement('div'),
            modalItensLista: document.createElement('div'), itensCount: null
        };
        attachEmprestimoEvents(els, { itens: [] });
        obs.value = 'abc';
        obs.dispatchEvent(new Event('input'));
        expect(document.getElementById('observacao-contador')?.textContent).toBe('3/250');
    });
});

describe('card de devolução', () => {
    it('tem botão Detalhes que não aninha role=button no card', () => {
        document.body.innerHTML = renderDevolucaoCard({
            id: 7, responsavel: 'Ana', aluno: 'Beto', itens: [], createdAt: new Date(), observacao: ''
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        const card = document.querySelector('.devolucao-item') as HTMLElement;
        const btn = card.querySelector<HTMLButtonElement>('.detalhes-btn');
        expect(btn?.type).toBe('button');
        expect(btn?.textContent?.trim()).toBe('Detalhes');
        expect(card.getAttribute('role')).toBeNull();
    });
});
