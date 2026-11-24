import { describe, expect, it } from 'vitest';
import { PRAZO_EXCLUSAO_EMPRESTIMO_MS, podeExcluirEmprestimo } from '../core/utils/exclusaoEmprestimo.js';

const AGORA = new Date('2026-11-24T12:00:00.000Z');
const h = (horas: number, minutos = 0) => new Date(AGORA.getTime() - (horas * 60 + minutos) * 60_000);
const loan = (criado: Date, retirada: Date = criado, status: 'aberto' | 'agendado' | 'devolvido' = 'aberto') =>
    ({ status, createdAt: criado, data: retirada.toISOString() });

describe('podeExcluirEmprestimo', () => {
    it('o prazo é de 24h', () => {
        expect(PRAZO_EXCLUSAO_EMPRESTIMO_MS).toBe(24 * 60 * 60 * 1000);
    });

    it('administrador sempre pode excluir um empréstimo em andamento', () => {
        expect(podeExcluirEmprestimo(loan(h(24 * 30)), 'ADMINISTRADOR', AGORA)).toBe(true);
    });

    it('editor: 23h59 pode, 24h exato pode, 24h01 não', () => {
        expect(podeExcluirEmprestimo(loan(h(23, 59)), 'EDITOR', AGORA)).toBe(true);
        expect(podeExcluirEmprestimo(loan(h(24)), 'EDITOR', AGORA)).toBe(true);
        expect(podeExcluirEmprestimo(loan(h(24, 1)), 'EDITOR', AGORA)).toBe(false);
    });

    it('usa o mais recente entre createdAt e dataRetirada (agendamento confirmado depois)', () => {
        // Criado há 3 dias, retirada confirmada há 1h: ainda dentro do prazo.
        expect(podeExcluirEmprestimo(loan(h(72), h(1)), 'EDITOR', AGORA)).toBe(true);
        // Retirada antiga, registro recente: vale o registro.
        expect(podeExcluirEmprestimo(loan(h(1), h(72)), 'EDITOR', AGORA)).toBe(true);
        expect(podeExcluirEmprestimo(loan(h(25), h(30)), 'EDITOR', AGORA)).toBe(false);
    });

    it('só empréstimos em andamento (nem agendado nem devolvido), mesmo para administrador', () => {
        expect(podeExcluirEmprestimo(loan(h(1), h(1), 'agendado'), 'ADMINISTRADOR', AGORA)).toBe(false);
        expect(podeExcluirEmprestimo(loan(h(1), h(1), 'devolvido'), 'ADMINISTRADOR', AGORA)).toBe(false);
        expect(podeExcluirEmprestimo(loan(h(1), h(1), 'devolvido'), 'EDITOR', AGORA)).toBe(false);
    });

    it('convidado (sem sessão) nunca', () => {
        expect(podeExcluirEmprestimo(loan(h(1)), null, AGORA)).toBe(false);
        expect(podeExcluirEmprestimo(loan(h(1)), undefined, AGORA)).toBe(false);
    });
});
