import { describe, expect, it } from 'vitest';
import { criarLeituraOrdenada, mesmoConteudo } from '../core/state/leituraOrdenada.js';

describe('leituraOrdenada', () => {
    it('descarta uma resposta antiga que chega depois de uma mais nova já aplicada', () => {
        const leituras = criarLeituraOrdenada();
        const antiga = leituras.iniciar();
        const nova = leituras.iniciar();
        expect(leituras.podeAplicar(nova)).toBe(true);
        expect(leituras.podeAplicar(antiga)).toBe(false);
    });

    it('aplica a resposta antiga se a mais nova ainda não chegou (ou falhou)', () => {
        const leituras = criarLeituraOrdenada();
        const antiga = leituras.iniciar();
        leituras.iniciar();
        expect(leituras.podeAplicar(antiga)).toBe(true);
    });

    it('mesmoConteudo compara por valor', () => {
        expect(mesmoConteudo([{ id: 1, nome: 'a' }], [{ id: 1, nome: 'a' }])).toBe(true);
        expect(mesmoConteudo([{ id: 1 }], [{ id: 2 }])).toBe(false);
    });
});
