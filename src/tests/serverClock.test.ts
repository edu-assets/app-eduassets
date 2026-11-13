import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agora, deslocamentoMs, registrarAmostra, reiniciarRelogio } from '../core/time/serverClock.js';

describe('serverClock', () => {
    beforeEach(() => {
        reiniciarRelogio();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-12T12:00:00.000Z'));
    });

    afterEach(() => vi.useRealTimers());

    it('sem amostras usa o relogio do aparelho', () => {
        expect(deslocamentoMs()).toBe(0);
        expect(agora().toISOString()).toBe('2026-11-12T12:00:00.000Z');
    });

    it('offset = serverTime - ponto medio da requisicao', () => {
        const t0 = Date.parse('2026-11-12T12:00:00.000Z');
        const t1 = t0 + 200;
        // Servidor 5 min a frente do aparelho: no ponto medio (t0+100) marcava 12:05:00.100
        registrarAmostra('2026-11-12T12:05:00.100Z', t0, t1);
        expect(deslocamentoMs()).toBe(5 * 60_000);
        expect(agora().toISOString()).toBe('2026-11-12T12:05:00.000Z');
    });

    it('aparelho adiantado gera offset negativo', () => {
        const t0 = Date.now();
        registrarAmostra(new Date(t0 - 90_000 + 50).toISOString(), t0, t0 + 100);
        expect(deslocamentoMs()).toBe(-90_000);
        expect(agora().getTime()).toBe(Date.now() - 90_000);
    });

    it('usa a amostra de menor RTT', () => {
        const t0 = Date.now();
        // RTT alto (2 s) com offset 3 s; RTT baixo (40 ms) com offset 1 s
        registrarAmostra(new Date(t0 + 1000 + 3000).toISOString(), t0, t0 + 2000);
        registrarAmostra(new Date(t0 + 20 + 1000).toISOString(), t0, t0 + 40);
        registrarAmostra(new Date(t0 + 500 + 9000).toISOString(), t0, t0 + 1000);
        expect(deslocamentoMs()).toBe(1000);
    });

    it('mantem apenas as ultimas 5 amostras', () => {
        const t0 = Date.now();
        // A melhor amostra (RTT 1 ms, offset 7 s) sai da janela depois de 5 novas amostras piores
        registrarAmostra(new Date(t0 + 7000).toISOString(), t0, t0 + 1);
        for (let i = 0; i < 5; i++) registrarAmostra(new Date(t0 + 100 + 2000).toISOString(), t0, t0 + 200);
        expect(deslocamentoMs()).toBe(2000);
    });

    it('ignora amostras invalidas', () => {
        const t0 = Date.now();
        registrarAmostra('nao-e-data', t0, t0 + 10);
        registrarAmostra(new Date(t0).toISOString(), t0 + 10, t0); // RTT negativo
        registrarAmostra(new Date(t0).toISOString(), Number.NaN, t0);
        expect(deslocamentoMs()).toBe(0);
    });
});
