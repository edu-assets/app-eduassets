// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sessao = vi.hoisted(() => ({
    admin: false,
    autenticado: true,
    convidado: false,
    listeners: [] as Array<() => void>,
}));

vi.mock('../core/auth/permissions.js', () => ({ isAdmin: () => sessao.admin }));
vi.mock('../core/state/authStore.js', () => ({
    isAutenticado: () => sessao.autenticado,
    isAcessoConvidadoAutorizado: () => sessao.convidado,
    subscribe: (callback: () => void) => {
        sessao.listeners.push(callback);
        return () => { sessao.listeners = sessao.listeners.filter((l) => l !== callback); };
    },
}));

import {
    EVENTO_PAINEL_ATIVADO,
    __resetNavigationForTests,
    getHashRotaAtual,
    getRotaAtual,
    initNavigation,
    navegarPara,
} from '../core/layout/navigation.js';
import { definirIdioma } from '../core/state/i18nStore.js';

const painel = (id: string) => `<section class="panel" id="${id}"><h2 class="panel-title">${id}</h2></section>`;

function montarShell(): void {
    document.body.innerHTML = `
        <aside id="sidebar">
            <nav class="sidebar-nav">
                <a href="#" class="nav-link active" data-panel="panel-inicio">Início</a>
                <a href="#" class="nav-link" data-panel="panel-devolucao">Devoluções</a>
                <a href="#" class="nav-link" data-panel="panel-dashboard">Dashboard</a>
                <a href="#" class="nav-link" data-panel="panel-cadastros" data-requires-admin>Cadastros</a>
            </nav>
            <div id="sidebar-footer"><a href="#app/perfil" class="nav-link" data-panel="panel-perfil">Meu perfil</a></div>
        </aside>
        <main>
            <section class="panel active" id="panel-inicio">
                <a href="#" class="inicio-acao-card nav-link" data-panel="panel-devolucao">Devolver</a>
            </section>
            ${painel('panel-devolucao')}
            <section class="panel" id="panel-dashboard">
                <h2 class="panel-title">Dashboard</h2>
                <button class="dashboard-tab-link active" role="tab" data-tab="estoque">Estoque</button>
                <button class="dashboard-tab-link" role="tab" data-tab="historico">Histórico</button>
            </section>
            ${painel('panel-cadastros')}
            ${painel('panel-perfil')}
            ${painel('panel-404')}
        </main>`;
    // Minimal stand-in for the dashboard tab logic (features/dashboard).
    document.querySelectorAll<HTMLElement>('.dashboard-tab-link').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.dashboard-tab-link').forEach((t) => t.classList.toggle('active', t === tab));
        });
    });
}

const ativo = () => document.querySelector('.panel.active')?.id;
const proximoHashchange = () => new Promise<void>((resolve) => window.addEventListener('hashchange', () => resolve(), { once: true }));
const link = (painelId: string) => document.querySelector<HTMLAnchorElement>(`.sidebar-nav .nav-link[data-panel="${painelId}"], #sidebar-footer .nav-link[data-panel="${painelId}"]`)!;

function irPara(hash: string): Promise<void> {
    const evento = proximoHashchange();
    window.location.hash = hash;
    return evento;
}

describe('hash router', () => {
    beforeEach(() => {
        sessao.admin = false;
        sessao.autenticado = true;
        sessao.convidado = false;
        definirIdioma('pt');
        window.history.replaceState(null, '', '/');
        montarShell();
    });

    afterEach(() => __resetNavigationForTests());

    it('restores the panel in the URL on load, without moving focus', () => {
        window.history.replaceState(null, '', '/#app/devolucoes');
        initNavigation();
        expect(ativo()).toBe('panel-devolucao');
        expect(document.title).toBe('Devoluções · eduAssets');
        expect(document.activeElement).toBe(document.body);
        expect(getRotaAtual()).toEqual({ slug: 'devolucoes' });
    });

    it('gives nav links real hrefs and navigates on click with a history entry', async () => {
        window.history.replaceState(null, '', '/#app');
        initNavigation();
        expect(window.location.hash).toBe('#app/inicio');
        expect(link('panel-devolucao').getAttribute('href')).toBe('#app/devolucoes');

        const mudou = proximoHashchange();
        const ativados: string[] = [];
        document.addEventListener(EVENTO_PAINEL_ATIVADO, (e) => ativados.push((e as CustomEvent).detail.painelId), { once: true });
        link('panel-devolucao').click();
        expect(ativo()).toBe('panel-devolucao');
        expect(window.location.hash).toBe('#app/devolucoes');
        expect(ativados).toEqual(['panel-devolucao']);
        await mudou;
        expect(ativo()).toBe('panel-devolucao');
    });

    it('renders the panel on hashchange (Back/Forward) and moves focus to its heading', async () => {
        window.history.replaceState(null, '', '/#app/inicio');
        initNavigation();
        await irPara('#app/dashboard');
        expect(ativo()).toBe('panel-dashboard');
        const titulo = document.querySelector<HTMLElement>('#panel-dashboard h2')!;
        expect(titulo.getAttribute('tabindex')).toBe('-1');
        expect(document.activeElement).toBe(titulo);
    });

    it('marks the active nav link with aria-current only inside the main navigation', () => {
        window.history.replaceState(null, '', '/#app/inicio');
        initNavigation();
        expect(link('panel-inicio').getAttribute('aria-current')).toBe('page');
        navegarPara('devolucoes');
        expect(link('panel-devolucao').getAttribute('aria-current')).toBe('page');
        expect(link('panel-devolucao').classList.contains('active')).toBe(true);
        expect(link('panel-inicio').hasAttribute('aria-current')).toBe(false);
        expect(document.querySelector('.inicio-acao-card')!.hasAttribute('aria-current')).toBe(false);
    });

    it('sends unknown slugs to the home panel without a history entry', async () => {
        window.history.replaceState(null, '', '/#app/inicio');
        initNavigation();
        navegarPara('devolucoes');
        await proximoHashchange();
        await irPara('#app/nao-existe');
        expect(ativo()).toBe('panel-inicio');
        expect(window.location.hash).toBe('#app/inicio');
        expect(navegarPara('xyz')).toEqual({ slug: 'inicio' });
    });

    it('redirects non-administrators away from admin-only panels', async () => {
        window.history.replaceState(null, '', '/#app/cadastros');
        initNavigation();
        expect(ativo()).toBe('panel-inicio');
        expect(window.location.hash).toBe('#app/inicio');

        await irPara('#app/cadastros');
        expect(ativo()).toBe('panel-inicio');
        expect(navegarPara('cadastros')).toEqual({ slug: 'inicio' });

        sessao.admin = true;
        expect(navegarPara('cadastros')).toEqual({ slug: 'cadastros' });
        expect(ativo()).toBe('panel-cadastros');

        // Losing admin rights (sign-out, other user) leaves the panel.
        sessao.admin = false;
        sessao.listeners.forEach((l) => l());
        expect(ativo()).toBe('panel-inicio');
        expect(window.location.hash).toBe('#app/inicio');
    });

    it('keeps guests out of account panels', () => {
        sessao.autenticado = false;
        sessao.convidado = true;
        window.history.replaceState(null, '', '/#app/perfil');
        initNavigation();
        expect(ativo()).toBe('panel-inicio');
        expect(navegarPara('perfil')).toEqual({ slug: 'inicio' });
    });

    it('supports the dashboard history tab in the URL', () => {
        window.history.replaceState(null, '', '/#app/dashboard/historico');
        initNavigation();
        expect(ativo()).toBe('panel-dashboard');
        expect(document.querySelector('.dashboard-tab-link.active')?.getAttribute('data-tab')).toBe('historico');

        document.querySelector<HTMLElement>('.dashboard-tab-link[data-tab="estoque"]')!.click();
        expect(window.location.hash).toBe('#app/dashboard');
        document.querySelector<HTMLElement>('.dashboard-tab-link[data-tab="historico"]')!.click();
        expect(window.location.hash).toBe('#app/dashboard/historico');
        expect(getHashRotaAtual()).toBe('#app/dashboard/historico');
    });

    it('translates the document title when the language changes', () => {
        window.history.replaceState(null, '', '/#app/devolucoes');
        initNavigation();
        expect(document.title).toBe('Devoluções · eduAssets');
        definirIdioma('en');
        expect(document.title).toBe('Returns · eduAssets');
        definirIdioma('pt');
    });

    it('reopens the last panel when the app is re-entered at bare #app (e.g. after the terms page)', async () => {
        window.history.replaceState(null, '', '/#app/devolucoes');
        initNavigation();
        await irPara('#termos');
        expect(getRotaAtual()).toEqual({ slug: 'devolucoes' });
        await irPara('#app');
        expect(ativo()).toBe('panel-devolucao');
        expect(window.location.hash).toBe('#app/devolucoes');
        // Entering from outside the app does not steal focus.
        expect(document.activeElement).toBe(document.body);
    });

    it('does not render app routes without a session or guest choice', async () => {
        sessao.autenticado = false;
        window.history.replaceState(null, '', '/#login');
        initNavigation();
        await irPara('#app/devolucoes');
        expect(ativo()).toBe('panel-inicio');
    });
});
