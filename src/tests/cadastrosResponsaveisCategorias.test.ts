// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pt from '../core/i18n/pt.json';
import en from '../core/i18n/en.json';
import { t } from '../core/state/i18nStore.js';
import {
    montarPayloadAtualizacaoResponsavel,
    nomeCategoriaAlterado,
    validarEdicaoResponsavel,
    validarRenomearCategoria,
    validarSenhaNovoUsuario
} from '../features/cadastros/logic.js';
import { renderItemRegistroResponsavel, renderItemRegistroCategoria } from '../features/cadastros/templates.js';
import { popularSelectResponsaveis } from '../features/emprestimo/render.js';

const CHAVES = [
    'backend.categorias.nao_encontrada',
    'backend.categorias.nome_duplicado',
    'backend.responsaveis.nao_encontrado',
    'backend.emprestimos.responsavel_inativo'
];

describe('API de categorias e responsáveis', () => {
    const fetchMock = vi.fn();
    beforeEach(() => {
        vi.resetModules();
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
        vi.doMock('../core/api/apiConfig.js', () => ({ API_BASE_URL: 'https://api.example.invalid' }));
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ cookieSession: true }), { status: 200 }));
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.doUnmock('../core/api/apiConfig.js');
    });

    it('PATCH /categorias/:id envia só o nome', async () => {
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 3, nome: 'Novo' }), { status: 200 }));
        const { atualizarCategoria } = await import('../core/api/categorias.js');
        await atualizarCategoria(3, 'Novo');
        const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
        expect(url).toBe('https://api.example.invalid/categorias/3');
        expect(init.method).toBe('PATCH');
        expect(JSON.parse(String(init.body))).toEqual({ nome: 'Novo' });
    });

    it('PATCH /responsaveis/:id envia os campos informados', async () => {
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 2 }), { status: 200 }));
        const { atualizarResponsavel } = await import('../core/api/responsaveis.js');
        await atualizarResponsavel(2, { ativo: false });
        const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
        expect(url).toBe('https://api.example.invalid/responsaveis/2');
        expect(init.method).toBe('PATCH');
        expect(JSON.parse(String(init.body))).toEqual({ ativo: false });
    });

    it('lista com ?incluirInativos=true só quando pedido', async () => {
        fetchMock.mockImplementation(() => Promise.resolve(new Response('[]', { status: 200 })));
        const { listarResponsaveis } = await import('../core/api/responsaveis.js');
        await listarResponsaveis({ incluirInativos: true });
        await listarResponsaveis();
        const urls = fetchMock.mock.calls.map((c) => String(c[0]));
        expect(urls).toContain('https://api.example.invalid/responsaveis?incluirInativos=true');
        expect(urls).toContain('https://api.example.invalid/responsaveis');
    });

    it.each([
        ['backend.categorias.nome_duplicado', 409],
        ['backend.categorias.nao_encontrada', 404],
        ['backend.responsaveis.nao_encontrado', 404]
    ])('mapeia %s para a mensagem traduzida', async (chave, status) => {
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ erro: chave }), { status }));
        const { atualizarCategoria } = await import('../core/api/categorias.js');
        await expect(atualizarCategoria(1, 'x')).rejects.toMatchObject({ status, message: t(chave) });
    });

    it('mapeia responsável inativo no empréstimo', async () => {
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ erro: 'backend.emprestimos.responsavel_inativo' }), { status: 409 }));
        const { http } = await import('../core/api/apiClient.js');
        await expect(http.post('/emprestimos', {})).rejects.toMatchObject({ message: t('backend.emprestimos.responsavel_inativo') });
    });
});

describe('i18n', () => {
    it.each(CHAVES)('%s existe em PT e EN', (chave) => {
        expect((pt as Record<string, string>)[chave]).toBeTruthy();
        expect((en as Record<string, string>)[chave]).toBeTruthy();
    });
    it('PT e EN têm o mesmo conjunto de chaves', () => {
        expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort());
    });
});

describe('lógica de edição', () => {
    it('categoria: valida vazio e detecta alteração', () => {
        expect(validarRenomearCategoria('A', '  ')).toBe('validation.cadastros.campo_obrigatorio');
        expect(validarRenomearCategoria('A', 'B')).toBeNull();
        expect(nomeCategoriaAlterado('A', ' A ')).toBeNull();
        expect(nomeCategoriaAlterado('A', ' B ')).toBe('B');
    });
    it('responsável: payload só com campos alterados', () => {
        const o = { nome: 'Ana', cargo: 'Prof' };
        expect(montarPayloadAtualizacaoResponsavel(o, { nome: 'Ana ', cargo: 'Coord' })).toEqual({ cargo: 'Coord' });
        expect(montarPayloadAtualizacaoResponsavel(o, { nome: 'Ana', cargo: 'Prof' })).toEqual({});
        expect(Object.keys(validarEdicaoResponsavel({ nome: '', cargo: ' ' }))).toHaveLength(2);
    });
    it('senha fraca é bloqueada, forte passa', () => {
        expect(validarSenhaNovoUsuario('abc')).toBe('validation.cadastros.senha_fraca');
        expect(validarSenhaNovoUsuario('Abcdefghij1!x')).toBeNull();
    });
});

describe('templates', () => {
    it('responsável inativo mostra badge e botão Reativar; ativo mostra Desativar', () => {
        const inativo = renderItemRegistroResponsavel({ id: 1, nome: 'Ana', cargo: 'Prof', ativo: false });
        expect(inativo).toContain('cadastro-badge--inativo');
        expect(inativo).toContain('data-reativar-responsavel-id="1"');
        const ativo = renderItemRegistroResponsavel({ id: 2, nome: 'Bia', cargo: 'Prof', ativo: true });
        expect(ativo).not.toContain('cadastro-badge--inativo');
        expect(ativo).toContain('data-desativar-responsavel-id="2"');
    });
    it('categoria em edição mostra formulário com erro inline', () => {
        const h = renderItemRegistroCategoria({ id: 5, nome: 'Notebook' }, { editandoId: 5 });
        expect(h).toContain('data-renomear-categoria-form="5"');
        expect(h).toContain('edit-categoria-nome-erro');
    });
    it('select do empréstimo omite responsáveis inativos', () => {
        document.body.innerHTML = '<select id="s"></select>';
        const select = document.getElementById('s') as HTMLSelectElement;
        popularSelectResponsaveis(select, [
            { id: 1, nome: 'Ana', cargo: 'x', ativo: true },
            { id: 2, nome: 'Bia', cargo: 'x', ativo: false }
        ]);
        const textos = Array.from(select.options).map((o) => o.textContent);
        expect(textos).toContain('Ana');
        expect(textos).not.toContain('Bia');
    });
});
