import { describe, expect, it } from 'vitest';
import { mapEmprestimo } from '../core/state/loanMapper.js';
import type { Emprestimo } from '../types/index.js';

function emprestimo(extra: Partial<Emprestimo> = {}): Emprestimo {
    return {
        id: 1, solicitanteNome: 'Ana', responsavelId: 2, status: 'ABERTO', dataRetirada: '2026-11-20T10:00:00.000Z',
        dataDevolucao: null, observacao: null, createdAt: '2026-11-20T09:00:00.000Z', itens: [], ...extra
    };
}

describe('mapEmprestimo: status e datas de agendamento', () => {
    it.each([
        ['ABERTO', 'aberto'],
        ['DEVOLVIDO', 'devolvido'],
        ['AGENDADO', 'agendado']
    ] as const)('%s -> %s', (api, ui) => {
        expect(mapEmprestimo(emprestimo({ status: api })).status).toBe(ui);
    });

    it('copia dataAgendada e dataPrevistaDevolucao (null quando ausentes)', () => {
        const agendado = mapEmprestimo(emprestimo({
            status: 'AGENDADO', dataAgendada: '2026-11-25T12:00:00.000Z', dataPrevistaDevolucao: '2026-11-25T13:00:00.000Z'
        }));
        expect(agendado.dataAgendada).toBe('2026-11-25T12:00:00.000Z');
        expect(agendado.dataPrevistaDevolucao).toBe('2026-11-25T13:00:00.000Z');
        expect(agendado.data).toBe('2026-11-20T10:00:00.000Z');

        const antigo = mapEmprestimo(emprestimo());
        expect(antigo.dataAgendada).toBeNull();
        expect(antigo.dataPrevistaDevolucao).toBeNull();
    });
});
