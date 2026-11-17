// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    instalarValidacaoTematica,
    limparErroCampo,
    mensagemValidacao,
    mostrarErroCampo,
    sinalizarErroCampo
} from '../shared/forms/fieldErrors.js';
import { setButtonLoading } from '../shared/dom/buttonLoading.js';
import { definirIdioma } from '../core/state/i18nStore.js';

function montar(html: string): HTMLFormElement {
    document.body.innerHTML = `<form id="f">${html}<button type="submit">Enviar</button></form>`;
    return document.getElementById('f') as HTMLFormElement;
}

describe('avisos de formulário inline', () => {
    beforeAll(() => {
        definirIdioma('pt');
        instalarValidacaoTematica();
    });
    beforeEach(() => { document.body.innerHTML = ''; });

    it('cancela o balão nativo e mostra o aviso tematizado abaixo do campo', () => {
        const form = montar('<input id="nome" required>');
        const campo = document.getElementById('nome') as HTMLInputElement;

        const evento = new Event('invalid', { cancelable: true });
        campo.dispatchEvent(evento);

        expect(evento.defaultPrevented).toBe(true);
        const aviso = document.getElementById('nome-field-error');
        expect(aviso?.classList.contains('field-error')).toBe(true);
        expect(aviso?.getAttribute('role')).toBe('alert');
        expect(aviso?.textContent).toContain('Preencha este campo.');
        expect(campo.nextElementSibling).toBe(aviso);
        expect(campo.getAttribute('aria-invalid')).toBe('true');
        expect(campo.getAttribute('aria-describedby')).toBe('nome-field-error');
        expect(form.checkValidity()).toBe(false);
    });

    it('checkValidity marca todos os inválidos e foca só o primeiro', () => {
        const form = montar('<input id="a" required><select id="b" required><option value="">--</option></select>');
        form.reportValidity();

        expect(document.getElementById('a-field-error')).not.toBeNull();
        expect(document.getElementById('b-field-error')?.textContent).toContain('Selecione uma opção.');
        expect(document.activeElement?.id).toBe('a');
    });

    it('não duplica o aviso em validações repetidas', () => {
        const form = montar('<input id="a" required>');
        form.reportValidity();
        form.reportValidity();
        expect(document.querySelectorAll('.field-error')).toHaveLength(1);
    });

    it('remove o aviso quando o campo fica válido, mas não a cada tecla enquanto ainda é inválido', () => {
        const form = montar('<input id="mail" type="email" required>');
        const campo = document.getElementById('mail') as HTMLInputElement;
        form.reportValidity();

        campo.value = 'abc';
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        expect(document.getElementById('mail-field-error')).not.toBeNull();

        campo.value = 'abc@escola.com';
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        expect(document.getElementById('mail-field-error')).toBeNull();
        expect(campo.hasAttribute('aria-invalid')).toBe(false);
        expect(campo.hasAttribute('aria-describedby')).toBe(false);
    });

    it('preserva outros ids de aria-describedby', () => {
        montar('<input id="a" aria-describedby="dica">');
        const campo = document.getElementById('a') as HTMLInputElement;
        mostrarErroCampo(campo, 'Erro');
        expect(campo.getAttribute('aria-describedby')).toBe('dica a-field-error');
        limparErroCampo(campo);
        expect(campo.getAttribute('aria-describedby')).toBe('dica');
    });

    it('posiciona o aviso depois do wrapper do campo (ex.: senha com botão de mostrar)', () => {
        montar('<div class="password-field"><input id="s" required><button type="button">olho</button></div>');
        const campo = document.getElementById('s') as HTMLInputElement;
        mostrarErroCampo(campo, 'Erro');
        expect(document.querySelector('.password-field')?.nextElementSibling?.id).toBe('s-field-error');
    });

    it('erro de regra de negócio some na próxima edição e foca o campo', () => {
        montar('<select id="eq"><option value="">--</option><option value="1">1</option></select>');
        const campo = document.getElementById('eq') as HTMLSelectElement;
        sinalizarErroCampo(campo, 'Escolha um equipamento.');
        expect(document.activeElement).toBe(campo);
        expect(document.getElementById('eq-field-error')?.textContent).toContain('Escolha um equipamento.');

        campo.dispatchEvent(new Event('change', { bubbles: true }));
        expect(document.getElementById('eq-field-error')).toBeNull();
    });

    it('usa o slot de erro que a tela já reserva (#<id>-erro) em vez de duplicar', () => {
        const form = montar('<input id="q" type="number" max="2" value="5"><span id="q-erro" hidden></span>');
        form.reportValidity();
        const slot = document.getElementById('q-erro') as HTMLElement;
        expect(slot.hidden).toBe(false);
        expect(slot.textContent).toBe('O valor máximo é 2.');
        expect(document.querySelector('.field-error')).toBeNull();

        const campo = document.getElementById('q') as HTMLInputElement;
        campo.value = '1';
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        expect(slot.hidden).toBe(true);
    });

    it('não sobrescreve a mensagem que a tela já mostra no próprio slot', () => {
        const form = montar('<input id="q" type="number" max="2" value="5"><span id="q-erro">Só 2 disponíveis.</span>');
        form.reportValidity();
        expect(document.getElementById('q-erro')?.textContent).toBe('Só 2 disponíveis.');
    });

    it('reset do formulário limpa os avisos', () => {
        const form = montar('<input id="a" required>');
        form.reportValidity();
        form.reset();
        expect(document.querySelector('.field-error')).toBeNull();
    });

    it('mensagens por tipo de validade e sobrescrita por data-msg-*', () => {
        montar('<input id="c" minlength="5" value=""><input id="o" required data-msg-obrigatorio="validacao.email">');
        const curto = document.getElementById('c') as HTMLInputElement;
        Object.defineProperty(curto, 'validity', { value: { tooShort: true } });
        expect(mensagemValidacao(curto)).toBe('Use pelo menos 5 caracteres.');
        expect(mensagemValidacao(document.getElementById('o') as HTMLInputElement)).toBe('Informe um e-mail válido.');
    });
});

describe('setButtonLoading', () => {
    it('sobrepõe o spinner sem trocar o conteúdo e restaura o estado', () => {
        document.body.innerHTML = '<button class="btn" id="b"><span class="material-symbols-outlined">save</span> Salvar</button>';
        const btn = document.getElementById('b') as HTMLButtonElement;

        setButtonLoading(btn, true);
        expect(btn.classList.contains('is-loading')).toBe(true);
        expect(btn.disabled).toBe(true);
        expect(btn.getAttribute('aria-busy')).toBe('true');
        expect(btn.querySelector(':scope > .btn-label')?.textContent).toContain('Salvar');
        expect(btn.querySelectorAll(':scope > .btn-spinner')).toHaveLength(1);

        setButtonLoading(btn, true);
        expect(btn.querySelectorAll(':scope > .btn-spinner')).toHaveLength(1);

        setButtonLoading(btn, false);
        expect(btn.classList.contains('is-loading')).toBe(false);
        expect(btn.disabled).toBe(false);
        expect(btn.hasAttribute('aria-busy')).toBe(false);
        expect(btn.querySelector('.btn-spinner')).toBeNull();
    });
});
