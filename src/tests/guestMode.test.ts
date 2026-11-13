// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../core/ui/index.js', () => ({ showToast: vi.fn() }));

import { applyGuestMode, GUEST_MESSAGE, EVENTO_ABRIR_LOGIN } from '../core/auth/guestMode.js';
import { definirIdioma } from '../core/state/i18nStore.js';
import { renderDashboardEstoqueContent } from '../features/dashboard/templates.js';
import { showToast } from '../core/ui/index.js';

describe('guestMode', () => {
    beforeEach(() => {
        sessionStorage.clear();
        definirIdioma('pt');
        document.body.className = 'guest-mode';
        document.body.innerHTML =
            '<main class="main-content"><section id="panel-emprestimo"><p class="panel-subtitle">x</p></section>' +
            '<button id="b" data-requires-auth title="orig">Salvar</button></main>';
        vi.clearAllMocks();
    });

    it('shows banner and loan notice for guests, removes when authenticated', () => {
        applyGuestMode(true);
        expect(document.getElementById('guest-banner')?.getAttribute('role')).toBe('status');
        expect(document.getElementById('guest-loan-notice')).not.toBeNull();
        applyGuestMode(false);
        expect(document.getElementById('guest-banner')).toBeNull();
        expect(document.getElementById('guest-loan-notice')).toBeNull();
    });

    it('dismiss persists in sessionStorage', () => {
        applyGuestMode(true);
        (document.querySelector('.guest-banner__close') as HTMLElement).click();
        expect(document.getElementById('guest-banner')).toBeNull();
        applyGuestMode(true);
        expect(document.getElementById('guest-banner')).toBeNull();
    });

    it('applies and restores aria-disabled and title', () => {
        const b = document.getElementById('b')!;
        applyGuestMode(true);
        expect(b.getAttribute('aria-disabled')).toBe('true');
        expect(b.title).toBe(GUEST_MESSAGE);
        applyGuestMode(false);
        expect(b.hasAttribute('aria-disabled')).toBe(false);
        expect(b.title).toBe('orig');
    });

    it('blocks click and keyboard activation', () => {
        const b = document.getElementById('b')!;
        const spy = vi.fn();
        b.addEventListener('click', spy);
        applyGuestMode(true);
        b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        b.click();
        expect(spy).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalled();
    });

    it('translates banner, notice and titles when switching to English', () => {
        applyGuestMode(true);
        definirIdioma('en');
        expect(document.querySelector('#guest-banner .guest-banner__text')?.textContent).toBe('Guest mode — read-only');
        expect(document.querySelector('#guest-loan-notice .guest-banner__text')?.textContent).toBe('Sign in to save changes.');
        expect(document.querySelector('.guest-banner__login')?.textContent).toBe('Sign in');
        expect(document.getElementById('b')!.title).toBe('Sign in to save changes.');
        definirIdioma('pt');
    });

    it('"Entrar" dispatches the open-login event', () => {
        const spy = vi.fn();
        document.addEventListener(EVENTO_ABRIR_LOGIN, spy);
        applyGuestMode(true);
        (document.querySelector('.guest-banner__login') as HTMLElement).click();
        expect(spy).toHaveBeenCalledTimes(1);
        document.removeEventListener(EVENTO_ABRIR_LOGIN, spy);
    });

    it('blocks and marks gated controls added after applyGuestMode', async () => {
        applyGuestMode(true);
        const late = document.createElement('div');
        late.innerHTML = '<button id="late" data-requires-admin>Excluir</button>';
        document.querySelector('main')!.append(late);
        await Promise.resolve();
        const btn = document.getElementById('late')!;
        expect(btn.getAttribute('aria-disabled')).toBe('true');
        const spy = vi.fn();
        btn.addEventListener('click', spy);
        btn.click();
        expect(spy).not.toHaveBeenCalled();
        applyGuestMode(false);
        expect(btn.hasAttribute('aria-disabled')).toBe(false);
    });

    it('intercepts gated controls even without aria-disabled while in guest-mode', () => {
        applyGuestMode(true);
        const btn = document.createElement('button');
        btn.setAttribute('data-requires-auth', '');
        document.body.append(btn);
        const spy = vi.fn();
        btn.addEventListener('click', spy);
        btn.click();
        expect(spy).not.toHaveBeenCalled();
    });

    it('does not block gated controls for authenticated users', async () => {
        document.body.className = '';
        applyGuestMode(false);
        const btn = document.createElement('button');
        btn.setAttribute('data-requires-auth', '');
        document.body.append(btn);
        await Promise.resolve();
        const spy = vi.fn();
        btn.addEventListener('click', spy);
        btn.click();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(btn.hasAttribute('aria-disabled')).toBe(false);
    });

    it('restores a translated original title in the current language', () => {
        const b = document.getElementById('b')!;
        applyGuestMode(true);
        definirIdioma('en');
        applyGuestMode(false);
        expect(b.title).toBe('orig');
        definirIdioma('pt');
    });

    it('stock badge follows the language on re-render', () => {
        const eq = { id: 1, modelo: 'M', categoria: { nome: 'C' }, quantidadeTotal: 20, quantidadeDisponivel: 1, quantidadeQuebrada: 0 } as never;
        definirIdioma('en');
        expect(renderDashboardEstoqueContent([eq])).toContain('Low stock');
        definirIdioma('pt');
        expect(renderDashboardEstoqueContent([eq])).toContain('Estoque baixo');
    });
});
