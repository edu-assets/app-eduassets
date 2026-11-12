import { describe, it, expect, vi } from 'vitest';

vi.mock('../core/state/equipamentoStore.js', () => ({ getEquipamentos: () => [] }));
vi.mock('../core/state/loanStore.js', () => ({ getLoansAbertos: () => [] }));
vi.mock('../core/state/ocorrenciasStore.js', () => ({ getOcorrenciasPorTipo: () => [] }));

import { filtrarEquipamentos, gerarCsvEstoque } from '../features/dashboard/service.js';
import type { Equipamento } from '../types/index.js';

function equipamento(id: number, modelo: string, categoria: string): Equipamento {
    return {
        id,
        categoriaId: id,
        modelo,
        quantidadeTotal: 10,
        quantidadeDisponivel: 8,
        quantidadeQuebrada: 1,
        createdAt: '',
        updatedAt: '',
        categoria: { id, nome: categoria } as Equipamento['categoria']
    };
}

const equipamentos = [
    equipamento(1, 'Galaxy Tab A8', 'Tablet'),
    equipamento(2, 'iPad 9', 'Tablet'),
    equipamento(3, 'ThinkPad E14', 'Notebook')
];

describe('filtrarEquipamentos', () => {
    it('encontra equipamentos pelo modelo', () => {
        expect(filtrarEquipamentos(equipamentos, 'ipad').map((e) => e.id)).toEqual([2]);
    });

    it('continua encontrando equipamentos pela categoria', () => {
        expect(filtrarEquipamentos(equipamentos, 'tablet').map((e) => e.id)).toEqual([1, 2]);
    });
});

describe('gerarCsvEstoque', () => {
    it('inclui o modelo para diferenciar equipamentos da mesma categoria', () => {
        const linhas = gerarCsvEstoque(equipamentos).replace('﻿', '').split('\r\n');

        expect(linhas[0]).toBe('Modelo;Categoria;Total;Disponivel;Em Manutencao;Quebrado');
        expect(linhas[1].startsWith('Galaxy Tab A8;Tablet;')).toBe(true);
        expect(linhas[2].startsWith('iPad 9;Tablet;')).toBe(true);
    });
});
