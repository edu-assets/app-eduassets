// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
vi.mock('../core/state/i18nStore.js', async () => {
    const ptDict = (await import('../core/i18n/pt.json')).default as Record<string, string>;
    return { t: (k: string) => ptDict[k] ?? k, getIdioma: () => 'pt', formatarDataHora: (v: unknown) => (typeof v === 'string' ? v : ''), getLocale: () => 'pt-BR' };
});

import { extrairAutoria, renderAutoriaEmprestimo, renderAutoriaOcorrencia, renderAutoriaEquipamento } from '../shared/components/autoria.js';
import { renderDevolucaoCard } from '../features/devolucao/templates.js';
import { renderDashboardHistoricoDetalheBody } from '../features/dashboard/templates.js';
import { renderControleLinha } from '../features/controle/templates.js';
import pt from '../core/i18n/pt.json';
import en from '../core/i18n/en.json';

const baseLoan = {
    id: 1, numero: 1, aluno: 'Beto', responsavel: 'Ana', responsavelId: 1, status: 'aberto', data: '01/01/2026',
    dataDevolucao: null, observacao: '', createdAt: new Date(), itens: []
};
const baseOc = {
    id: 5, equipamentoId: 2, tipo: 'quebrado', status: 'aberto', categoria: 'Aulas', modelo: 'T', numero: '1',
    problema: 'tela', descricao: 'x', registradoEm: '01/01/2026', resolvidoEm: '', medidas: ''
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const L = (o: object) => ({ ...baseLoan, ...o }) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const O = (o: object) => ({ ...baseOc, ...o }) as any;

describe('chaves i18n de autoria', () => {
    it('existem em pt e en', () => {
        const chaves = Object.keys(pt).filter((k) => k.startsWith('autoria.'));
        expect(chaves).toHaveLength(7);
        chaves.forEach((k) => expect((en as Record<string, string>)[k]).toBeTruthy());
    });
});

describe('extrairAutoria', () => {
    it('nao cria chaves para dados de convidado', () => {
        expect(extrairAutoria({ id: 1 })).toEqual({});
    });
    it('preserva autor nulo e normaliza o objeto', () => {
        const a = extrairAutoria({ criadoPor: { id: 3, nome: 'Zé', x: 1 }, atualizadoPor: null, atualizadoEm: undefined });
        expect(a).toEqual({ criadoPor: { id: 3, nome: 'Zé' }, atualizadoPor: null });
    });
});

describe('emprestimos', () => {
    it('card mostra Registrado por com o autor, escapando o nome', () => {
        const html = renderDevolucaoCard(L({ criadoPor: { id: 1, nome: '<b>Zé</b>' } }));
        expect(html).toContain('Registrado por');
        expect(html).toContain('&lt;b&gt;Zé&lt;/b&gt;');
        expect(html).not.toContain('<b>Zé</b>');
    });
    it('autor nulo mostra traco', () => {
        const html = renderDevolucaoCard(L({ criadoPor: null }));
        expect(html).toContain('Registrado por');
        expect(html).toContain('autoria-nome">—<');
    });
    it('convidado: sem linhas de autoria', () => {
        expect(renderDevolucaoCard(L({}))).not.toContain('Registrado por');
        expect(renderAutoriaEmprestimo(L({}))).toBe('');
    });
    it('detalhe: editado por com data e devolvido por apenas quando devolvido', () => {
        const aberto = renderAutoriaEmprestimo(L({
            criadoPor: { id: 1, nome: 'A' }, atualizadoPor: { id: 2, nome: 'B' }, atualizadoEm: '2026-01-02T10:00:00Z', devolvidoPor: null
        }));
        expect(aberto).toContain('Editado por');
        expect(aberto).toContain('autoria-data');
        expect(aberto).not.toContain('Devolvido por');
        const devolvido = renderAutoriaEmprestimo(L({ status: 'devolvido', criadoPor: null, devolvidoPor: { id: 3, nome: 'C' } }));
        expect(devolvido).toContain('Devolvido por');
        expect(devolvido).toContain('>C<');
    });
    it('historico do dashboard inclui autoria quando presente e nao para convidado', () => {
        const com = renderDashboardHistoricoDetalheBody(L({ status: 'devolvido', criadoPor: { id: 1, nome: 'A' }, devolvidoPor: { id: 2, nome: 'B' } }));
        expect(com).toContain('Registrado por');
        expect(com).toContain('Devolvido por');
        expect(renderDashboardHistoricoDetalheBody(L({}))).not.toContain('Registrado por');
    });
});

describe('ocorrencias e equipamentos', () => {
    it('controle: Criada por e Resolvida por so quando resolvida', () => {
        const aberta = renderControleLinha('quebrado', O({ criadoPor: { id: 1, nome: 'A' }, resolvidoPor: null }));
        expect(aberta).toContain('Criada por');
        expect(aberta).not.toContain('Resolvida por');
        const resolvida = renderControleLinha('resolvidos', O({ status: 'resolvidos', criadoPor: null, resolvidoPor: { id: 2, nome: 'R' } }));
        expect(resolvida).toContain('Resolvida por');
        expect(resolvida).toContain('>R<');
    });
    it('convidado: sem autoria na linha do controle', () => {
        expect(renderControleLinha('quebrado', O({}))).not.toContain('Criada por');
        expect(renderAutoriaOcorrencia(O({}))).toBe('');
    });
    it('equipamento: cadastrado/atualizado por', () => {
        const h = renderAutoriaEquipamento({ criadoPor: { id: 1, nome: 'A' }, atualizadoPor: null });
        expect(h).toContain('Cadastrado por');
        expect(h).not.toContain('Atualizado por');
        const editado = renderAutoriaEquipamento({ criadoPor: { id: 1, nome: 'A' }, atualizadoPor: { id: 2, nome: 'B' } });
        expect(editado).toContain('Atualizado por');
        expect(renderAutoriaEquipamento({})).toBe('');
    });
});
