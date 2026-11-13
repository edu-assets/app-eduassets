// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({ alterarSenha: vi.fn(), fetchMe: vi.fn() }));
vi.mock('../core/api/auth.js', () => apiMocks);
vi.mock('../core/api/index.js', () => ({ ApiError: class extends Error {} }));
vi.mock('../core/state/authStore.js', () => ({ getUsuario: () => null, atualizarUsuarioLocal: vi.fn() }));
vi.mock('../core/ui/index.js', () => ({ showToast: vi.fn() }));
vi.mock('../core/state/i18nStore.js', () => ({ t: (k: string) => k, getIdioma: () => 'pt', traduzirErro: (e: unknown) => (e as Error).message }));
vi.mock('../core/auth/guestGate.js', () => ({ bloquearSeConvidado: () => false }));

import { avaliarSenha, aprimorarCampoSenha, senhaAtendeRegras } from '../shared/components/passwordField.js';

describe('avaliarSenha', () => {
    it('avalia cada regra', () => {
        expect(avaliarSenha('Abcdefghij1#')).toEqual({ tamanho: true, bytes: true, minuscula: true, maiuscula: true, numero: true, especial: true });
        expect(avaliarSenha('abc')).toMatchObject({ tamanho: false, maiuscula: false, numero: false, especial: false });
    });

    it('conta bytes UTF-8, não caracteres', () => {
        const ok = `Aa1#${'é'.repeat(34)}`; // 4 + 68 = 72 bytes
        const longa = `Aa1#${'é'.repeat(35)}`; // 74 bytes
        expect(avaliarSenha(ok).bytes).toBe(true);
        expect(avaliarSenha(longa).bytes).toBe(false);
        expect(senhaAtendeRegras(longa)).toBe(false);
    });

    it('letra acentuada conta como símbolo', () => {
        expect(avaliarSenha('Abcdefghij1é').especial).toBe(true);
        expect(avaliarSenha('Abcdefghij1x').especial).toBe(false);
    });
});

describe('aprimorarCampoSenha', () => {
    beforeEach(() => { document.body.innerHTML = '<div><input type="password" id="p"></div>'; });

    it('alterna a visibilidade com aria-pressed e rótulo', () => {
        const input = document.getElementById('p') as HTMLInputElement;
        aprimorarCampoSenha(input);
        const botao = document.querySelector<HTMLButtonElement>('.password-field__toggle')!;
        expect(botao.getAttribute('aria-pressed')).toBe('false');
        expect(botao.getAttribute('aria-label')).toBe('password.mostrar');
        botao.click();
        expect(input.type).toBe('text');
        expect(botao.getAttribute('aria-pressed')).toBe('true');
        expect(botao.getAttribute('aria-label')).toBe('password.ocultar');
        expect(botao.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('checklist atualiza ao digitar e é idempotente', () => {
        const input = document.getElementById('p') as HTMLInputElement;
        aprimorarCampoSenha(input, { checklist: true });
        aprimorarCampoSenha(input, { checklist: true });
        expect(document.querySelectorAll('.password-rules').length).toBe(1);
        input.value = 'abc';
        input.dispatchEvent(new Event('input'));
        expect(document.querySelector('[data-regra="minuscula"]')?.getAttribute('data-state')).toBe('met');
        expect(document.querySelector('[data-regra="maiuscula"]')?.getAttribute('data-state')).toBe('unmet');
        expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe('password.resumo'.replace('{n}', '1').replace('{total}', '6'));
    });
});

describe('formulário de troca de senha', () => {
    async function montar() {
        document.body.innerHTML = `<form id="f"><input id="a" type="password"><input id="n" type="password"><input id="c" type="password">
            <p id="e"></p><button id="s" type="submit"></button></form>`;
        const { attachSegurancaEvents } = await import('../features/seguranca/events.js');
        const g = (id: string) => document.getElementById(id)!;
        const els = {
            formSenha: g('f'), inputAtual: g('a'), inputNova: g('n'), inputConfirmar: g('c'), erro: g('e'), btnSalvar: g('s'),
            btnToggleSenha: document.createElement('button'), btnCancelar: document.createElement('button'), email: null, senhaAlteradaEm: null
        };
        attachSegurancaEvents(els as never, { formAberto: true });
        return g;
    }
    const preencher = (g: (i: string) => HTMLElement, a: string, n: string, c: string) => {
        (g('a') as HTMLInputElement).value = a;
        (g('n') as HTMLInputElement).value = n;
        (g('c') as HTMLInputElement).value = c;
    };
    const enviar = (g: (i: string) => HTMLElement) => g('f').dispatchEvent(new Event('submit', { cancelable: true }));

    beforeEach(() => vi.clearAllMocks());

    it('submit (Enter) envia quando válido', async () => {
        const g = await montar();
        apiMocks.alterarSenha.mockResolvedValue(undefined);
        apiMocks.fetchMe.mockResolvedValue({});
        preencher(g, 'SenhaAntiga#1x', 'NovaSenha#2026x', 'NovaSenha#2026x');
        enviar(g);
        await vi.waitFor(() => expect(apiMocks.alterarSenha).toHaveBeenCalledWith('SenhaAntiga#1x', 'NovaSenha#2026x'));
    });

    it('bloqueia nova senha igual à atual', async () => {
        const g = await montar();
        preencher(g, 'NovaSenha#2026x', 'NovaSenha#2026x', 'NovaSenha#2026x');
        enviar(g);
        expect(g('e').textContent).toBe('validation.seguranca.nova_igual_atual');
        expect(apiMocks.alterarSenha).not.toHaveBeenCalled();
    });

    it('bloqueia senha fraca e confirmação diferente', async () => {
        const g = await montar();
        preencher(g, 'x', 'fraca', 'fraca');
        enviar(g);
        expect(g('e').textContent).toBe('validation.cadastros.senha_fraca');
        preencher(g, 'x', 'NovaSenha#2026x', 'Outra');
        enviar(g);
        expect(g('e').textContent).toBe('validation.seguranca.confirmacao_incorreta');
        expect(apiMocks.alterarSenha).not.toHaveBeenCalled();
    });
});
