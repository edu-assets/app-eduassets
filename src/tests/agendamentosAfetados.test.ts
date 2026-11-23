import { describe, expect, it } from 'vitest';
import { extrairAgendamentosAfetados } from '../core/utils/agendamentosAfetados.js';

const ag = (id: number) => ({ id, solicitanteNome: `Aluno ${id}`, dataAgendada: '2026-11-25T09:00:00.000Z', dataPrevistaDevolucao: '2026-11-25T10:00:00.000Z' });

describe('extrairAgendamentosAfetados', () => {
    it('junta os agendamentos de cada ocorrência criada, sem repetir', () => {
        const resposta = [{ id: 1, agendamentosAfetados: [ag(7), ag(8)] }, { id: 2, agendamentosAfetados: [ag(8)] }, { id: 3, agendamentosAfetados: [] }];
        expect(extrairAgendamentosAfetados(resposta).map((a) => a.id)).toEqual([7, 8]);
    });
    it('sem o campo (API antiga, OBSERVACAO ou resposta vazia) devolve lista vazia', () => {
        expect(extrairAgendamentosAfetados([{ id: 1 }])).toEqual([]);
        expect(extrairAgendamentosAfetados([])).toEqual([]);
        expect(extrairAgendamentosAfetados(null)).toEqual([]);
    });
});
