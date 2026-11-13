// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/auth/permissions.js', () => ({ isAdmin: () => true }));

import {
    abrirPainelDaNotificacao,
    descartarPainelPendente,
    painelDaUrlNotificacao
} from '../core/notifications/notificationRouting.js';

describe('painelDaUrlNotificacao', () => {
    it('maps the backend URLs: loans/returns to the Dashboard, incidents to Controle', () => {
        expect(painelDaUrlNotificacao('/#panel-dashboard')).toBe('panel-dashboard');
        expect(painelDaUrlNotificacao('/#panel-controle')).toBe('panel-controle');
        expect(painelDaUrlNotificacao('https://app.eduassets.tech/#panel-controle')).toBe('panel-controle');
    });

    it('accepts known panels and short aliases', () => {
        expect(painelDaUrlNotificacao('/#panel-inicio')).toBe('panel-inicio');
        expect(painelDaUrlNotificacao('/#ocorrencias')).toBe('panel-controle');
        expect(painelDaUrlNotificacao('/#controle')).toBe('panel-controle');
        expect(painelDaUrlNotificacao('/#emprestimos')).toBe('panel-dashboard');
        expect(painelDaUrlNotificacao('/#devolucoes')).toBe('panel-dashboard');
        expect(painelDaUrlNotificacao('/?painel=emprestimos')).toBe('panel-dashboard');
        expect(painelDaUrlNotificacao('/?panel=devolucoes')).toBe('panel-dashboard');
    });

    it('rejects unknown panels, empty values and non-strings', () => {
        expect(painelDaUrlNotificacao('/#panel-config')).toBeNull();
        expect(painelDaUrlNotificacao('/#app')).toBeNull();
        expect(painelDaUrlNotificacao('/')).toBeNull();
        expect(painelDaUrlNotificacao('')).toBeNull();
        expect(painelDaUrlNotificacao(undefined)).toBeNull();
        expect(painelDaUrlNotificacao(42)).toBeNull();
    });
});

describe('abrirPainelDaNotificacao', () => {
    const cliques: string[] = [];

    beforeEach(() => {
        cliques.length = 0;
        document.body.innerHTML = `
            <a class="nav-link" data-panel="panel-dashboard"></a>
            <a class="nav-link" data-panel="panel-controle"></a>
            <span class="dashboard-tab-link active" data-tab="estoque"></span>
            <span class="dashboard-tab-link" data-tab="historico"></span>`;
        document.querySelectorAll<HTMLElement>('[data-panel], [data-tab]').forEach((el) => {
            el.addEventListener('click', () => cliques.push(el.dataset.panel ?? `tab:${el.dataset.tab}`));
        });
    });

    afterEach(() => descartarPainelPendente());

    it('opens the Dashboard and then selects the History tab', () => {
        abrirPainelDaNotificacao('/#panel-dashboard');
        expect(cliques).toEqual(['panel-dashboard', 'tab:historico']);
    });

    it('loan and return aliases also land on the History tab', () => {
        abrirPainelDaNotificacao('/#emprestimos');
        abrirPainelDaNotificacao('/#devolucoes');
        expect(cliques).toEqual(['panel-dashboard', 'tab:historico', 'panel-dashboard', 'tab:historico']);
    });

    it('keeps the legacy #panel-controle working and does not touch the dashboard tabs', () => {
        abrirPainelDaNotificacao('/#panel-controle');
        expect(cliques).toEqual(['panel-controle']);
    });

    it('does nothing for unknown URLs', () => {
        abrirPainelDaNotificacao('/#panel-config');
        expect(cliques).toEqual([]);
    });
});
