// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const equipamentos = [
    { id: 1, modelo: 'Notebook', categoria: { nome: 'Informática' }, quantidadeTotal: 5, quantidadeQuebrada: 0, quantidadeDisponivel: 3 },
    // Tudo emprestado agora, mas dentro da capacidade: pode ser agendado.
    { id: 2, modelo: 'Projetor', categoria: { nome: 'Áudio e vídeo' }, quantidadeTotal: 2, quantidadeQuebrada: 0, quantidadeDisponivel: 0 },
    // Sem capacidade (tudo quebrado): nem agendando.
    { id: 3, modelo: 'Cabo', categoria: { nome: 'Acessórios' }, quantidadeTotal: 1, quantidadeQuebrada: 1, quantidadeDisponivel: 0 }
];

vi.mock('../core/state/i18nStore.js', () => ({
    getIdioma: () => 'pt', formatarDataHora: (v: unknown) => (typeof v === 'string' ? v : ''), getLocale: () => 'pt-BR',
    t: (key: string) => ({
        'emprestimo.disponivel_singular': '{n} disponível',
        'emprestimo.disponivel_plural': '{n} disponíveis',
        'emprestimo.quantidade_maxima': 'Máximo: {max}',
        'emprestimo.sem_unidades_disponiveis': 'Sem unidades',
        'emprestimo.aviso_disponivel_agora_singular': 'Só {n} disponível agora',
        'emprestimo.aviso_disponivel_agora_plural': 'Só {n} disponíveis agora',
        'emprestimo.aviso_nenhuma_disponivel_agora': 'Nenhuma disponível agora',
        'dashboard.detalhes': 'Detalhes',
        'devolucao.devolver': 'Devolver'
    } as Record<string, string>)[key] ?? key,
    traduzirErro: () => ''
}));
vi.mock('../core/state/equipamentoStore.js', () => ({
    getEquipamentos: () => equipamentos,
    subscribe: () => () => undefined
}));

import { popularSelectEquipamentos, disponivelRestante, capacidadeRestante } from '../features/emprestimo/render.js';
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
            <input id="quantidade" type="number" value="1"><span id="quantidade-erro" hidden></span><span id="quantidade-aviso" hidden></span>
            <textarea id="observacao" maxlength="250"></textarea><span id="observacao-contador">0/250</span></form>`;
        select = document.getElementById('equipamento') as HTMLSelectElement;
        qtd = document.getElementById('quantidade') as HTMLInputElement;
    });

    it('mostra disponíveis agora na opção; só desabilita o que não tem nem capacidade', () => {
        popularSelectEquipamentos(select, eqs, []);
        const opts = Array.from(select.options);
        expect(opts[1].text).toBe('Notebook — Informática (3 disponíveis)');
        expect(opts[1].disabled).toBe(false);
        // Projetor: 0 na prateleira, mas 2 de capacidade -> continua selecionável (para agendar).
        expect(opts[2].text).toContain('(0 disponíveis)');
        expect(opts[2].disabled).toBe(false);
        expect(opts[3].disabled).toBe(true);
    });

    it('desconta itens já adicionados e preserva a seleção', () => {
        popularSelectEquipamentos(select, eqs, []);
        select.value = '1';
        popularSelectEquipamentos(select, eqs, [{ id: '1', nome: 'Notebook', quantidade: 2 }]);
        expect(select.value).toBe('1');
        expect(select.options[1].text).toContain('(1 disponível)');
        expect(disponivelRestante(eqs[0], [{ id: '1', nome: 'x', quantidade: 3 }])).toBe(0);
        expect(capacidadeRestante(eqs[0], [{ id: '1', nome: 'x', quantidade: 3 }])).toBe(2);
    });

    it('max = capacidade: acima disso erro inline; entre o disponível agora e a capacidade, só aviso', () => {
        popularSelectEquipamentos(select, eqs, []);
        select.value = '1';
        const els = { equipamentoSelect: select, quantidadeInput: qtd };
        atualizarLimiteQuantidade(els, { itens: [] });
        expect(qtd.max).toBe('5');
        expect(qtd.hasAttribute('aria-invalid')).toBe(false);

        const erro = document.getElementById('quantidade-erro') as HTMLElement;
        const aviso = document.getElementById('quantidade-aviso') as HTMLElement;

        // 4 > 3 disponíveis agora, mas cabe na capacidade (5): aviso, não erro.
        qtd.value = '4';
        atualizarLimiteQuantidade(els, { itens: [] });
        expect(qtd.hasAttribute('aria-invalid')).toBe(false);
        expect(erro.hidden).toBe(true);
        expect(aviso.hidden).toBe(false);
        expect(aviso.textContent).toBe('Só 3 disponíveis agora');

        qtd.value = '6';
        atualizarLimiteQuantidade(els, { itens: [] });
        expect(qtd.getAttribute('aria-invalid')).toBe('true');
        expect(erro.hidden).toBe(false);
        expect(erro.textContent).toBe('Máximo: 5');
        expect(aviso.hidden).toBe(true);

        qtd.value = '2';
        atualizarLimiteQuantidade(els, { itens: [] });
        expect(qtd.hasAttribute('aria-invalid')).toBe(false);
        expect(erro.hidden).toBe(true);
        expect(aviso.hidden).toBe(true);
    });

    it('sem nenhuma na prateleira avisa "Nenhuma disponível agora"', () => {
        popularSelectEquipamentos(select, eqs, []);
        select.value = '2';
        atualizarLimiteQuantidade({ equipamentoSelect: select, quantidadeInput: qtd }, { itens: [] });
        expect((document.getElementById('quantidade-aviso') as HTMLElement).textContent).toBe('Nenhuma disponível agora');
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
