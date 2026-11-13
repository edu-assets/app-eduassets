import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/api/apiConfig.js', () => ({ API_BASE_URL: 'https://api.example.invalid' }));
vi.mock('../core/state/i18nStore.js', () => ({ t: (key: string) => key }));

const fetchMock = vi.fn();

function resposta(corpo: unknown, status = 200): Response {
    return new Response(JSON.stringify(corpo), { status });
}

describe('obterEstadoSync', () => {
    beforeEach(() => {
        vi.resetModules();
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
        fetchMock.mockResolvedValueOnce(resposta({ cookieSession: true }));
    });

    afterEach(() => vi.unstubAllGlobals());

    it('envia o header passivo, o cursor e calibra o relogio do servidor', async () => {
        const serverTime = new Date(Date.now() + 120_000).toISOString();
        fetchMock.mockResolvedValueOnce(resposta({ serverTime, cursor: '42', entidades: ['Emprestimo'] }));
        const { obterEstadoSync } = await import('../core/api/sync.js');
        const { deslocamentoMs } = await import('../core/time/serverClock.js');

        const estado = await obterEstadoSync('41');

        expect(estado.entidades).toEqual(['Emprestimo']);
        const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
        expect(url).toBe('https://api.example.invalid/sync/estado?desde=41');
        expect(new Headers(init.headers).get('x-eduassets-atividade')).toBe('passiva');
        expect(init.credentials).toBe('include');
        expect(Math.abs(deslocamentoMs() - 120_000)).toBeLessThan(2_000);
    });

    it('primeira chamada nao envia desde', async () => {
        fetchMock.mockResolvedValueOnce(resposta({ serverTime: new Date().toISOString(), cursor: '0', entidades: [] }));
        const { obterEstadoSync } = await import('../core/api/sync.js');
        await obterEstadoSync();
        expect(fetchMock.mock.calls[1][0]).toBe('https://api.example.invalid/sync/estado');
    });

    it('requisicoes comuns nao levam o header passivo; get com passivo leva', async () => {
        fetchMock.mockResolvedValueOnce(resposta([])).mockResolvedValueOnce(resposta([]));
        const { http } = await import('../core/api/apiClient.js');
        await http.get('/equipamentos');
        await http.get('/equipamentos', { passivo: true });
        expect(new Headers((fetchMock.mock.calls[1][1] as RequestInit).headers).get('x-eduassets-atividade')).toBeNull();
        expect(new Headers((fetchMock.mock.calls[2][1] as RequestInit).headers).get('x-eduassets-atividade')).toBe('passiva');
    });

    it('devolverEmprestimo sem data nao envia dataDevolucao; com data envia', async () => {
        fetchMock.mockResolvedValueOnce(resposta({ id: 1 })).mockResolvedValueOnce(resposta({ id: 1 }));
        const { devolverEmprestimo } = await import('../core/api/emprestimos.js');
        await devolverEmprestimo(1);
        await devolverEmprestimo(1, '2026-11-12T12:00:00.000Z');
        expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)).toEqual({});
        expect(JSON.parse((fetchMock.mock.calls[2][1] as RequestInit).body as string)).toEqual({ dataDevolucao: '2026-11-12T12:00:00.000Z' });
    });
});
