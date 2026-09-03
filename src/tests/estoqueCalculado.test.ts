import { describe, it, expect } from 'vitest';
import { contarEmprestadoPorEquipamento, contarManutencaoPorEquipamento } from '../core/utils/estoque.js';

describe('contarEmprestadoPorEquipamento', () => {
    it('soma quantidades do mesmo equipamento em empréstimos diferentes', () => {
        const loansAbertos = [
            { itens: [{ id: 1, quantidade: 2 }] },
            { itens: [{ id: 1, quantidade: 3 }, { id: 2, quantidade: 1 }] }
        ];

        const resultado = contarEmprestadoPorEquipamento(loansAbertos);

        expect(resultado.get('1')).toBe(5);
        expect(resultado.get('2')).toBe(1);
    });

    it('trata ids numéricos e string como equivalentes', () => {
        const loansAbertos = [
            { itens: [{ id: 1, quantidade: 2 }] },
            { itens: [{ id: '1', quantidade: 1 }] }
        ];

        const resultado = contarEmprestadoPorEquipamento(loansAbertos);

        expect(resultado.get('1')).toBe(3);
        expect(resultado.size).toBe(1);
    });

    it('retorna mapa vazio quando não há empréstimos abertos', () => {
        expect(contarEmprestadoPorEquipamento([]).size).toBe(0);
    });
});

describe('contarManutencaoPorEquipamento', () => {
    it('conta uma ocorrência por registro, agrupado por equipamentoId', () => {
        const ocorrencias = [
            { equipamentoId: 1 },
            { equipamentoId: 1 },
            { equipamentoId: 2 }
        ];

        const resultado = contarManutencaoPorEquipamento(ocorrencias);

        expect(resultado.get('1')).toBe(2);
        expect(resultado.get('2')).toBe(1);
    });
});