// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/state/i18nStore.js', () => ({ t: (k: string) => k }));

import { aprimorarCampoSenha } from '../shared/components/passwordField.js';
import { closeModal } from '../core/ui/modal.js';

describe('estado de visibilidade da senha', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div class="modal-overlay active" id="m"><form id="f"><input id="p" type="password"></form></div>';
    });
    const botao = () => document.querySelector<HTMLButtonElement>('.password-field__toggle')!;
    const input = () => document.getElementById('p') as HTMLInputElement;

    it('sem checklist, input programático reflete o tipo no botão', () => {
        aprimorarCampoSenha(input());
        botao().click();
        input().type = 'password';
        input().dispatchEvent(new Event('input'));
        expect(botao().getAttribute('aria-pressed')).toBe('false');
    });

    it('submit oculta a senha', () => {
        aprimorarCampoSenha(input());
        botao().click();
        expect(input().type).toBe('text');
        document.getElementById('f')!.dispatchEvent(new Event('submit', { cancelable: true }));
        expect(input().type).toBe('password');
        expect(botao().getAttribute('aria-pressed')).toBe('false');
    });

    it('reset do form oculta a senha', async () => {
        aprimorarCampoSenha(input(), { checklist: true });
        botao().click();
        (document.getElementById('f') as HTMLFormElement).reset();
        await new Promise((r) => setTimeout(r, 5));
        expect(input().type).toBe('password');
    });

    it('fechar o modal oculta a senha', () => {
        aprimorarCampoSenha(input());
        botao().click();
        closeModal('m');
        expect(input().type).toBe('password');
        expect(botao().getAttribute('aria-pressed')).toBe('false');
    });
});
