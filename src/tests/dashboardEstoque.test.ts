import { describe, it, expect, vi } from 'vitest';

vi.mock('../core/state/equipamentoStore.js', () => ({ getEquipamentos: () => [] }));
vi.mock('../core/state/loanStore.js', () => ({ getLoansAbertos: () => [] }));
vi.mock('../core/state/ocorrenciasStore.js', () => ({ getOcorrenciasPorTipo: () => [] }));
vi.mock('../shared/components/restrictedPerson.js', () => ({ renderPessoaProtegida: (p: unknown) => String(p ?? '') }));
vi.mock('../shared/components/autoria.js', () => ({ renderAutoriaEmprestimo: () => '', envolverAutoria: (x: unknown) => x }));
vi.mock('../core/state/i18nStore.js', () => ({
    formatarDataHora: (v: unknown) => (typeof v === 'string' ? v : ''), getLocale: () => 'pt-BR',
    t: (chave: string) => ({
        'dashboard.estoque_esgotado': 'Esgotado',
        'dashboard.estoque_baixo': 'Estoque baixo'
    } as Record<string, string>)[chave] ?? chave
}));

import { filtrarEquipamentos, gerarCsvEstoque } from '../features/dashboard/service.js';
import { renderDashboardEstoqueContent, statusEstoqueEquipamento } from '../features/dashboard/templates.js';
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

function comEstoque(quantidadeTotal: number, quantidadeDisponivel: number): Equipamento {
    return { ...equipamento(9, 'Teste', 'Tablet'), quantidadeTotal, quantidadeDisponivel };
}

describe('statusEstoqueEquipamento (badges da linha de estoque)', () => {
    it('disponível 0 com total > 0 → esgotado', () => {
        expect(statusEstoqueEquipamento(comEstoque(5, 0))).toBe('esgotado');
        expect(renderDashboardEstoqueContent([comEstoque(5, 0)])).toContain('status-badge--esgotado');
        expect(renderDashboardEstoqueContent([comEstoque(5, 0)])).toContain('Esgotado');
    });

    it('1 de 20 disponível → estoque baixo', () => {
        expect(statusEstoqueEquipamento(comEstoque(20, 1))).toBe('estoque-baixo');
        expect(renderDashboardEstoqueContent([comEstoque(20, 1)])).toContain('Estoque baixo');
    });

    it('total pequeno (< 10): 1 disponível → estoque baixo; 2 de 5 → sem badge', () => {
        expect(statusEstoqueEquipamento(comEstoque(5, 1))).toBe('estoque-baixo');
        expect(statusEstoqueEquipamento(comEstoque(9, 1))).toBe('estoque-baixo');
        expect(statusEstoqueEquipamento(comEstoque(5, 2))).toBeNull();
        expect(statusEstoqueEquipamento(comEstoque(20, 3))).toBeNull();
    });

    it('5 de 20 disponível → sem badge', () => {
        expect(statusEstoqueEquipamento(comEstoque(20, 5))).toBeNull();
        expect(renderDashboardEstoqueContent([comEstoque(20, 5)])).not.toContain('status-badge');
    });

    it('total 0 → sem badge', () => {
        expect(statusEstoqueEquipamento(comEstoque(0, 0))).toBeNull();
        expect(renderDashboardEstoqueContent([comEstoque(0, 0)])).not.toContain('status-badge');
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
