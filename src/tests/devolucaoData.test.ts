import { describe, expect, it, vi } from 'vitest';

vi.mock('../core/state/i18nStore.js', () => ({ getIdioma: () => 'pt', t: (key: string) => key }));

import { dataDevolucaoParaEnvio } from '../features/devolucao/utils.js';

describe('dataDevolucaoParaEnvio', () => {
    const escolhida = new Date('2026-11-12T10:30:00.000Z');

    it('campo automatico: nao envia data (o servidor usa o proprio horario)', () => {
        expect(dataDevolucaoParaEnvio(true, escolhida)).toBeUndefined();
        expect(dataDevolucaoParaEnvio(true, undefined)).toBeUndefined();
    });

    it('campo editado manualmente: envia o instante escolhido', () => {
        expect(dataDevolucaoParaEnvio(false, escolhida)).toBe('2026-11-12T10:30:00.000Z');
    });

    it('data invalida ou ausente nunca vira string', () => {
        expect(dataDevolucaoParaEnvio(false, undefined)).toBeUndefined();
        expect(dataDevolucaoParaEnvio(false, new Date('x'))).toBeUndefined();
    });
});
