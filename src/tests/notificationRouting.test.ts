import { describe, expect, it, vi } from 'vitest';

vi.mock('../core/auth/permissions.js', () => ({ isAdmin: () => true }));

import { painelDaUrlNotificacao } from '../core/notifications/notificationRouting.js';

describe('painelDaUrlNotificacao', () => {
    it('maps the backend URL to the Controle panel', () => {
        expect(painelDaUrlNotificacao('/#panel-controle')).toBe('panel-controle');
        expect(painelDaUrlNotificacao('https://app.eduassets.tech/#panel-controle')).toBe('panel-controle');
    });

    it('accepts known panels and short aliases (loans, returns and incidents live in Controle)', () => {
        expect(painelDaUrlNotificacao('/#panel-dashboard')).toBe('panel-dashboard');
        expect(painelDaUrlNotificacao('/#ocorrencias')).toBe('panel-controle');
        expect(painelDaUrlNotificacao('/?painel=emprestimos')).toBe('panel-controle');
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
