// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/auth/permissions.js', () => ({ isAdmin: () => true }));
const navegarPara = vi.hoisted(() => vi.fn());
vi.mock('../core/layout/navigation.js', () => ({ navegarPara }));

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

    it('accepts the panel routes (#app/<slug>) of the hash router', () => {
        expect(painelDaUrlNotificacao('/#app/controle')).toBe('panel-controle');
        expect(painelDaUrlNotificacao('/#app/dashboard/historico')).toBe('panel-dashboard');
        expect(painelDaUrlNotificacao('https://app.eduassets.tech/#app/devolucoes')).toBe('panel-devolucao');
        expect(painelDaUrlNotificacao('/#app/configuracoes')).toBeNull();
        expect(painelDaUrlNotificacao('/#app/nao-existe')).toBeNull();
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
    beforeEach(() => navegarPara.mockClear());
    afterEach(() => descartarPainelPendente());

    it('opens the Dashboard on the History tab through the router', () => {
        abrirPainelDaNotificacao('/#panel-dashboard');
        expect(navegarPara.mock.calls).toEqual([['dashboard', { aba: 'historico' }]]);
    });

    it('loan and return aliases also land on the History tab', () => {
        abrirPainelDaNotificacao('/#emprestimos');
        abrirPainelDaNotificacao('/#devolucoes');
        expect(navegarPara.mock.calls).toEqual([['dashboard', { aba: 'historico' }], ['dashboard', { aba: 'historico' }]]);
    });

    it('keeps the legacy #panel-controle working and accepts the new #app/controle route', () => {
        abrirPainelDaNotificacao('/#panel-controle');
        abrirPainelDaNotificacao('/#app/controle');
        expect(navegarPara.mock.calls).toEqual([['controle', {}], ['controle', {}]]);
    });

    it('does nothing for unknown URLs', () => {
        abrirPainelDaNotificacao('/#panel-config');
        expect(navegarPara).not.toHaveBeenCalled();
    });
});
