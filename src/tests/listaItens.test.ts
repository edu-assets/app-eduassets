import { describe, it, expect } from 'vitest';
import { adicionarOuIncrementarItem, removerItemPorId, atualizarQuantidadeItem } from '../core/utils/listaItens.js';
import type { ItemComQuantidade } from '../core/utils/listaItens.js';

interface ItemTeste extends ItemComQuantidade {
    nome: string;
}

describe('adicionarOuIncrementarItem', () => {
    it('adiciona um item novo à lista', () => {
        const itens: ItemTeste[] = [];
        const resultado = adicionarOuIncrementarItem(itens, { id: 1, nome: 'Notebook', quantidade: 2 });

        expect(resultado).toHaveLength(1);
        expect(resultado[0]).toEqual({ id: 1, nome: 'Notebook', quantidade: 2 });
    });

    it('incrementa a quantidade quando o item já existe (comparando id como string)', () => {
        const itens: ItemTeste[] = [{ id: 1, nome: 'Notebook', quantidade: 2 }];
        const resultado = adicionarOuIncrementarItem(itens, { id: '1', nome: 'Notebook', quantidade: 3 });

        expect(resultado).toHaveLength(1);
        expect(resultado[0].quantidade).toBe(5);
    });

    it('não muta o array original', () => {
        const itens: ItemTeste[] = [{ id: 1, nome: 'Notebook', quantidade: 2 }];
        adicionarOuIncrementarItem(itens, { id: 2, nome: 'Tablet', quantidade: 1 });

        expect(itens).toHaveLength(1);
    });
});

describe('removerItemPorId', () => {
    it('remove o item correspondente, comparando id como string', () => {
        const itens: ItemTeste[] = [
            { id: 1, nome: 'Notebook', quantidade: 2 },
            { id: 2, nome: 'Tablet', quantidade: 1 }
        ];

        const resultado = removerItemPorId(itens, '1');

        expect(resultado).toHaveLength(1);
        expect(resultado[0].id).toBe(2);
    });

    it('retorna a lista intacta se o id não existir', () => {
        const itens: ItemTeste[] = [{ id: 1, nome: 'Notebook', quantidade: 2 }];
        const resultado = removerItemPorId(itens, 999);

        expect(resultado).toHaveLength(1);
    });
});

describe('atualizarQuantidadeItem', () => {
    it('atualiza a quantidade do item correspondente', () => {
        const itens: ItemTeste[] = [{ id: 1, nome: 'Notebook', quantidade: 2 }];
        const resultado = atualizarQuantidadeItem(itens, 1, 5);

        expect(resultado[0].quantidade).toBe(5);
    });

    it('nunca deixa a quantidade ir abaixo de 1', () => {
        const itens: ItemTeste[] = [{ id: 1, nome: 'Notebook', quantidade: 2 }];
        const resultado = atualizarQuantidadeItem(itens, 1, -3);

        expect(resultado[0].quantidade).toBe(1);
    });

    it('cai para 1 quando o valor não é numérico', () => {
        const itens: ItemTeste[] = [{ id: 1, nome: 'Notebook', quantidade: 2 }];
        const resultado = atualizarQuantidadeItem(itens, 1, NaN);

        expect(resultado[0].quantidade).toBe(1);
    });
});