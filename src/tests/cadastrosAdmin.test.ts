// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pt from '../core/i18n/pt.json';
import en from '../core/i18n/en.json';
import {
    filtrarPorBusca,
    loginPareceEmail,
    montarPayloadAjusteTotal,
    montarPayloadAtualizacaoUsuario,
    quantidadeEmUso,
    validarCamposCadastro,
    validarEdicaoUsuario
} from '../features/cadastros/logic.js';
import { t } from '../core/state/i18nStore.js';
import { renderItemRegistroUsuario } from '../features/cadastros/templates.js';
import type { Usuario } from '../types/index.js';

describe('atualizarUsuario payload', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.resetModules();
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
        vi.doMock('../core/api/apiConfig.js', () => ({ API_BASE_URL: 'https://api.example.invalid' }));
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.doUnmock('../core/api/apiConfig.js');
    });

    it('PATCHes /usuarios/:id with only the given fields', async () => {
        fetchMock
            .mockResolvedValueOnce(new Response(JSON.stringify({ cookieSession: true }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ id: 7, nome: 'Ana' }), { status: 200 }));
        const { atualizarUsuario } = await import('../core/api/usuarios.js');

        await atualizarUsuario(7, { nome: 'Ana', ativo: false });

        const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
        expect(url).toBe('https://api.example.invalid/usuarios/7');
        expect(init.method).toBe('PATCH');
        expect(JSON.parse(String(init.body))).toEqual({ nome: 'Ana', ativo: false });
    });

    it.each([
        'backend.usuarios.nao_pode_desativar_a_si_mesmo',
        'backend.usuarios.nao_pode_rebaixar_a_si_mesmo',
        'backend.usuarios.ultimo_administrador',
        'backend.equipamentos.quantidade_em_uso'
    ])('maps API error key %s to the translated message', async (chave) => {
        fetchMock
            .mockResolvedValueOnce(new Response(JSON.stringify({ cookieSession: true }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ erro: chave }), { status: 409 }));
        const { atualizarUsuario } = await import('../core/api/usuarios.js');

        await expect(atualizarUsuario(1, { ativo: false })).rejects.toMatchObject({
            status: 409,
            message: t(chave)
        });
        expect((en as Record<string, string>)[chave]).toBeTruthy();
    });

    it('has the exact PT texts required by the product', () => {
        const p = pt as Record<string, string>;
        expect(p['backend.usuarios.nao_pode_desativar_a_si_mesmo']).toBe('Você não pode desativar a própria conta.');
        expect(p['backend.usuarios.nao_pode_rebaixar_a_si_mesmo']).toBe('Você não pode rebaixar o próprio nível de acesso.');
        expect(p['backend.usuarios.ultimo_administrador']).toBe('O sistema precisa manter ao menos um administrador ativo.');
    });
});

describe('montarPayloadAtualizacaoUsuario', () => {
    const original = { nome: 'Ana', login: 'ana@escola.com', nivelAcesso: 'EDITOR' as const };

    it('sends only changed fields', () => {
        expect(montarPayloadAtualizacaoUsuario(original, { nome: ' Ana Maria ', login: 'ana@escola.com', nivelAcesso: 'EDITOR' }))
            .toEqual({ nome: 'Ana Maria' });
        expect(montarPayloadAtualizacaoUsuario(original, { nome: 'Ana', login: 'nova@escola.com', nivelAcesso: 'ADMINISTRADOR' }))
            .toEqual({ login: 'nova@escola.com', nivelAcesso: 'ADMINISTRADOR' });
        expect(montarPayloadAtualizacaoUsuario(original, { nome: 'Ana', login: 'ana@escola.com', nivelAcesso: 'EDITOR' })).toEqual({});
    });

    it('does not re-validate an unchanged legacy login but rejects a bad new one', () => {
        const legado = { ...original, login: 'admin' };
        expect(validarEdicaoUsuario(legado, { nome: 'Ana', login: 'admin' })).toEqual({});
        expect(validarEdicaoUsuario(legado, { nome: 'Ana', login: 'outro' })).toEqual({
            'edit-usuario-login': 'validation.cadastros.email_invalido'
        });
        expect(validarEdicaoUsuario(legado, { nome: ' ', login: '' })).toEqual({
            'edit-usuario-nome': 'validation.cadastros.campo_obrigatorio',
            'edit-usuario-login': 'validation.cadastros.campo_obrigatorio'
        });
    });
});

describe('montarPayloadAjusteTotal', () => {
    const eq = { quantidadeTotal: 10, quantidadeDisponivel: 6 };

    it('sends only quantidadeTotal (the server applies the delta)', () => {
        expect(montarPayloadAjusteTotal(eq, 15)).toEqual({ ok: true, payload: { quantidadeTotal: 15 } });
        expect(montarPayloadAjusteTotal(eq, 7)).toEqual({ ok: true, payload: { quantidadeTotal: 7 } });
        expect(montarPayloadAjusteTotal(eq, 4)).toEqual({ ok: true, payload: { quantidadeTotal: 4 } });
    });

    it('refuses totals below the items in use', () => {
        expect(quantidadeEmUso(eq)).toBe(4);
        expect(montarPayloadAjusteTotal(eq, 3)).toEqual({ ok: false, erro: 'validation.cadastros.total_abaixo_em_uso', emUso: 4 });
    });

    it('refuses non-positive or fractional values', () => {
        expect(montarPayloadAjusteTotal(eq, 0)).toMatchObject({ ok: false, erro: 'validation.cadastros.quantidade_invalida' });
        expect(montarPayloadAjusteTotal(eq, NaN)).toMatchObject({ ok: false });
        expect(montarPayloadAjusteTotal(eq, 2.5)).toMatchObject({ ok: false });
    });
});

describe('validarCamposCadastro', () => {
    const campos = [
        { id: 'a', type: 'text' },
        { id: 'b', type: 'email' },
        { id: 'c', type: 'number' },
        { id: 'd', type: 'select' }
    ];

    it('returns per-field i18n keys', () => {
        expect(validarCamposCadastro(campos, { a: '', b: 'x', c: '0', d: '' })).toEqual({
            a: 'validation.cadastros.campo_obrigatorio',
            b: 'validation.cadastros.email_invalido',
            c: 'validation.cadastros.quantidade_invalida',
            d: 'validation.cadastros.campo_obrigatorio'
        });
        expect(validarCamposCadastro(campos, { a: 'x', b: 'a@b.co', c: '3', d: 'EDITOR' })).toEqual({});
    });

    it('detects e-mail shaped logins', () => {
        expect(loginPareceEmail('a@b.com')).toBe(true);
        expect(loginPareceEmail('admin')).toBe(false);
        expect(loginPareceEmail('a b@c.com')).toBe(false);
        expect(loginPareceEmail('josé@escola.com.br')).toBe(false);
    });
});

describe('filtrarPorBusca', () => {
    const itens = ['Notebook Dell', 'Projetor Épson', 'Cabo HDMI'];

    it('is case/accent insensitive and requires every word', () => {
        expect(filtrarPorBusca(itens, 'epson', (i) => i)).toEqual(['Projetor Épson']);
        expect(filtrarPorBusca(itens, 'NOTE dell', (i) => i)).toEqual(['Notebook Dell']);
        expect(filtrarPorBusca(itens, 'zzz', (i) => i)).toEqual([]);
        expect(filtrarPorBusca(itens, '   ', (i) => i)).toEqual(itens);
    });
});

describe('renderItemRegistroUsuario', () => {
    const base: Usuario = { id: 1, nome: 'Ana', login: 'ana@escola.com', nivelAcesso: 'EDITOR', createdAt: '', possuiCartaoRfid: false };

    it('offers edit and deactivate for others, no self-deactivate', () => {
        const outro = renderItemRegistroUsuario(base, { usuarioAtualId: 2 });
        expect(outro).toContain('data-editar-usuario-id="1"');
        expect(outro).toContain('data-desativar-usuario-id="1"');
        const proprio = renderItemRegistroUsuario(base, { usuarioAtualId: 1 });
        expect(proprio).not.toContain('data-desativar-usuario-id');
    });

    it('shows inactive and invalid-login badges', () => {
        const html = renderItemRegistroUsuario({ ...base, login: 'admin', ativo: false }, { usuarioAtualId: 2 });
        expect(html).toContain('cadastro-badge--inativo');
        expect(html).toContain('cadastro-badge--aviso');
        expect(html).toContain('data-reativar-usuario-id="1"');
    });
});

describe('autoria nas listas', () => {
    const base: Usuario = { id: 1, nome: 'Ana', login: 'ana@escola.com', nivelAcesso: 'EDITOR', createdAt: '', possuiCartaoRfid: false };

    it('partesAutoria omits absent fields and maps null to a dash', async () => {
        const { partesAutoria } = await import('../features/cadastros/logic.js');
        expect(partesAutoria({}, 'a', 'b')).toEqual([]);
        expect(partesAutoria({ criadoPor: null }, 'a', 'b')).toEqual([{ chave: 'a', nome: '—' }]);
        expect(partesAutoria({ criadoPor: { id: 1, nome: 'X' }, atualizadoPor: null }, 'a', 'b'))
            .toEqual([{ chave: 'a', nome: 'X' }]);
        expect(partesAutoria({ criadoPor: { id: 1, nome: 'X' }, atualizadoPor: { id: 2, nome: 'Y' } }, 'a', 'b'))
            .toEqual([{ chave: 'a', nome: 'X' }, { chave: 'b', nome: 'Y' }]);
        expect(partesAutoria({ criadoPor: { id: 1, nome: 'X' } }, 'a')).toEqual([{ chave: 'a', nome: 'X' }]);
    });

    it('renders the user line with escaped names and no line when absent', () => {
        const com = renderItemRegistroUsuario({ ...base, criadoPor: { id: 2, nome: '<b>Bob</b>' }, atualizadoPor: null }, { usuarioAtualId: 9 });
        expect(com).toContain('cadastro-autoria');
        expect(com).toContain('&lt;b&gt;Bob&lt;/b&gt;');
        expect(com).not.toContain('<b>Bob');
        expect(com).not.toContain('Updated by');
        expect(renderItemRegistroUsuario(base, { usuarioAtualId: 9 })).not.toContain('cadastro-autoria');
    });

    it('renders equipment and simple-record lines', async () => {
        const { renderItemRegistroEquipamento, renderItemRegistro } = await import('../features/cadastros/templates.js');
        const eq = { id: 1, categoriaId: 1, modelo: 'M', quantidadeTotal: 2, quantidadeDisponivel: 1, quantidadeQuebrada: 0, createdAt: '', updatedAt: '', criadoPor: { id: 1, nome: 'Zed' }, atualizadoPor: { id: 2, nome: 'Yan' } };
        const h = renderItemRegistroEquipamento(eq);
        expect(h).toContain('Zed');
        expect(h).toContain('Yan');
        expect(renderItemRegistro('Notebook', { criadoPor: { id: 1, nome: 'Zed' } })).toContain('Zed');
        expect(renderItemRegistro('Notebook')).not.toContain('cadastro-autoria');
    });
});

describe('confirm button label', () => {
    it('sets label, icon and i18n key per call', async () => {
        document.body.innerHTML = '<button id="b"><span class="material-symbols-outlined">delete</span> Excluir registro </button>';
        const { definirRotuloConfirmar } = await import('../core/ui/confirm.js');
        const b = document.getElementById('b') as HTMLElement;
        definirRotuloConfirmar(b, 'cadastros.reativar', 'person_check');
        expect(b.dataset.i18nKey).toBe('cadastros.reativar');
        expect(b.textContent).toContain(t('cadastros.reativar'));
        expect(b.textContent).not.toContain('Excluir');
        expect(b.querySelector('.material-symbols-outlined')?.textContent).toBe('person_check');
    });
});
