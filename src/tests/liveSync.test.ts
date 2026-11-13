// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    autenticado: true,
    authListeners: [] as Array<(estado: { autenticado: boolean; usuario: unknown }) => void>,
    obterEstadoSync: vi.fn(),
    carregarEquipamentos: vi.fn(),
    carregarEmprestimos: vi.fn(),
    carregarOcorrencias: vi.fn(),
    carregarResponsaveis: vi.fn()
}));

vi.mock('../core/state/authStore.js', () => ({
    isAutenticado: () => mocks.autenticado,
    subscribe: (listener: (estado: { autenticado: boolean; usuario: unknown }) => void) => {
        mocks.authListeners.push(listener);
        return () => { mocks.authListeners = mocks.authListeners.filter((item) => item !== listener); };
    }
}));
vi.mock('../core/api/sync.js', () => ({ obterEstadoSync: mocks.obterEstadoSync }));
vi.mock('../core/state/equipamentoStore.js', () => ({ carregarEquipamentos: mocks.carregarEquipamentos }));
vi.mock('../core/state/loanStore.js', () => ({ carregarEmprestimos: mocks.carregarEmprestimos }));
vi.mock('../core/state/ocorrenciasStore.js', () => ({ carregarOcorrencias: mocks.carregarOcorrencias }));
vi.mock('../core/state/responsavelStore.js', () => ({ carregarResponsaveis: mocks.carregarResponsaveis }));

type LiveSync = typeof import('../core/state/liveSync.js');
type SessionVersion = typeof import('../core/state/sessionDataVersion.js');

let liveSync: LiveSync;
let sessao: SessionVersion;

const todosOsLoaders = () => [
    mocks.carregarEquipamentos,
    mocks.carregarEmprestimos,
    mocks.carregarOcorrencias,
    mocks.carregarResponsaveis
];

function estado(entidades: string[], cursor = '10') {
    return { serverTime: new Date().toISOString(), cursor, entidades };
}

function definirVisibilidade(valor: 'visible' | 'hidden'): void {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => valor });
    document.dispatchEvent(new Event('visibilitychange'));
}

function erroApi(status: number): Error & { status: number } {
    return Object.assign(new Error(`HTTP ${status}`), { status });
}

function deferred<T>() {
    let resolve!: (valor: T) => void;
    let reject!: (erro: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

/** Cursor guardado após a consulta inicial (recuado pela margem que cobre a corrida com a carga inicial). */
function cursorInicial(servidor: string): string {
    return String(Math.max(0, Number(servidor) - liveSync.MARGEM_CURSOR_INICIAL));
}

/** Inicia o liveSync e deixa a primeira consulta (que obtém o cursor) terminar. */
async function iniciar(): Promise<void> {
    liveSync.iniciarLiveSync();
    await vi.advanceTimersByTimeAsync(0);
}

describe('liveSync', () => {
    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-12T12:00:00.000Z'));
        mocks.autenticado = true;
        mocks.authListeners = [];
        mocks.obterEstadoSync.mockReset().mockResolvedValue(estado([]));
        todosOsLoaders().forEach((loader) => loader.mockReset().mockResolvedValue([]));
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        definirVisibilidade('visible');
        liveSync = await import('../core/state/liveSync.js');
        sessao = await import('../core/state/sessionDataVersion.js');
    });

    afterEach(() => {
        liveSync.pararLiveSync();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('a primeira consulta so obtem o cursor (sem desde) e nao recarrega listas', async () => {
        mocks.obterEstadoSync.mockResolvedValue(estado([], '7'));
        await iniciar();

        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(1);
        expect(mocks.obterEstadoSync).toHaveBeenLastCalledWith(undefined);
        todosOsLoaders().forEach((loader) => expect(loader).not.toHaveBeenCalled());

        await vi.advanceTimersByTimeAsync(30_000);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(2);
        expect(mocks.obterEstadoSync).toHaveBeenLastCalledWith(cursorInicial('7'));
    });

    it('cursor inicial recua a margem: mudancas gravadas durante a carga inicial aparecem na proxima consulta', async () => {
        mocks.obterEstadoSync.mockResolvedValueOnce(estado([], '500'));
        await iniciar();
        mocks.obterEstadoSync.mockResolvedValueOnce(estado(['Ocorrencia'], '501'));
        await vi.advanceTimersByTimeAsync(30_000);
        expect(mocks.obterEstadoSync).toHaveBeenLastCalledWith('450');
        expect(mocks.carregarOcorrencias).toHaveBeenCalledTimes(1);
    });

    it('consulta inicial falhou: a proxima consulta sem cursor faz recarga completa', async () => {
        mocks.obterEstadoSync.mockRejectedValueOnce(erroApi(503));
        await iniciar();
        todosOsLoaders().forEach((loader) => expect(loader).not.toHaveBeenCalled());

        mocks.obterEstadoSync.mockResolvedValueOnce(estado([], '30'));
        await vi.advanceTimersByTimeAsync(60_000); // recuo apos a falha
        todosOsLoaders().forEach((loader) => expect(loader).toHaveBeenCalledTimes(1));

        await vi.advanceTimersByTimeAsync(30_000);
        expect(mocks.obterEstadoSync).toHaveBeenLastCalledWith('30');
    });

    it('polling a cada 30 s e recarga apenas os stores das entidades alteradas, de forma passiva', async () => {
        await iniciar();
        mocks.obterEstadoSync.mockResolvedValueOnce(estado(['Emprestimo'], '11'));

        await vi.advanceTimersByTimeAsync(30_000);

        expect(mocks.carregarEmprestimos).toHaveBeenCalledWith({ passivo: true });
        expect(mocks.carregarEquipamentos).toHaveBeenCalledWith({ passivo: true });
        expect(mocks.carregarOcorrencias).not.toHaveBeenCalled();
        expect(mocks.carregarResponsaveis).not.toHaveBeenCalled();

        mocks.obterEstadoSync.mockResolvedValueOnce(estado([], '11'));
        await vi.advanceTimersByTimeAsync(30_000);
        expect(mocks.obterEstadoSync).toHaveBeenLastCalledWith('11');
        expect(mocks.carregarEmprestimos).toHaveBeenCalledTimes(1);
    });

    it.each([
        [['Ocorrencia'], ['carregarOcorrencias', 'carregarEquipamentos']],
        [['Equipamento'], ['carregarEquipamentos']],
        [['Categoria'], ['carregarEquipamentos']],
        [['Responsavel'], ['carregarResponsaveis']],
        [['Emprestimo', 'Responsavel'], ['carregarEmprestimos', 'carregarEquipamentos', 'carregarResponsaveis']],
        [['Usuario', 'Desconhecida'], []]
    ] as const)('mapa entidade -> stores: %j', async (entidades, esperados) => {
        await iniciar();
        mocks.obterEstadoSync.mockResolvedValueOnce(estado([...entidades], '12'));
        await vi.advanceTimersByTimeAsync(30_000);

        const chamados = (Object.keys(mocks) as Array<keyof typeof mocks>)
            .filter((chave) => chave.startsWith('carregar') && (mocks[chave] as ReturnType<typeof vi.fn>).mock.calls.length > 0)
            .sort();
        expect(chamados).toEqual([...esperados].sort());
    });

    it('pausa com a aba oculta e atualiza na hora ao voltar', async () => {
        await iniciar();
        definirVisibilidade('hidden');
        mocks.obterEstadoSync.mockClear();

        await vi.advanceTimersByTimeAsync(5 * 60_000);
        expect(mocks.obterEstadoSync).not.toHaveBeenCalled();

        definirVisibilidade('visible');
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(1);
    });

    it('focus e online tambem disparam atualizacao imediata', async () => {
        await iniciar();
        mocks.obterEstadoSync.mockClear();

        // logo apos uma consulta, o foco nao gera outra (protege a cota por IP)
        window.dispatchEvent(new Event('focus'));
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.obterEstadoSync).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(liveSync.INTERVALO_MINIMO_GATILHO_MS);
        window.dispatchEvent(new Event('focus'));
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(liveSync.INTERVALO_MINIMO_GATILHO_MS);
        window.dispatchEvent(new Event('online'));
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(2);
    });

    it('single-flight: nunca ha duas atualizacoes simultaneas e as solicitacoes viram uma repeticao', async () => {
        await iniciar();
        mocks.obterEstadoSync.mockClear();
        const primeira = deferred<ReturnType<typeof estado>>();
        let simultaneas = 0;
        let maximo = 0;
        mocks.obterEstadoSync.mockImplementation(async () => {
            simultaneas += 1;
            maximo = Math.max(maximo, simultaneas);
            try {
                return await (mocks.obterEstadoSync.mock.calls.length === 1 ? primeira.promise : Promise.resolve(estado([])));
            } finally {
                simultaneas -= 1;
            }
        });

        const a = liveSync.atualizarAgora();
        const b = liveSync.atualizarAgora();
        const c = liveSync.atualizarAgora();
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(1);

        primeira.resolve(estado([]));
        await Promise.all([a, b, c]);

        // 1 em andamento + 1 repeticao pendente (as 2 solicitacoes extras foram coalescidas)
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(2);
        expect(maximo).toBe(1);
    });

    it('recuo em erro de rede: 30 -> 60 -> 120 s e volta a 30 s apos sucesso', async () => {
        await iniciar();
        mocks.obterEstadoSync.mockClear();
        mocks.obterEstadoSync.mockRejectedValue(erroApi(503));

        await vi.advanceTimersByTimeAsync(30_000);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(59_000);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1_000);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(119_000);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(1_000);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(3);

        // teto de 120 s
        await vi.advanceTimersByTimeAsync(120_000);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(4);

        mocks.obterEstadoSync.mockResolvedValue(estado([]));
        await vi.advanceTimersByTimeAsync(120_000);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(5);
        await vi.advanceTimersByTimeAsync(30_000);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(6);
    });

    it('nao avanca o cursor quando a recarga falha: a mesma mudanca e repetida', async () => {
        await iniciar();
        mocks.obterEstadoSync.mockClear();
        mocks.obterEstadoSync.mockResolvedValue(estado(['Equipamento'], '20'));
        mocks.carregarEquipamentos.mockRejectedValueOnce(erroApi(503));

        await vi.advanceTimersByTimeAsync(30_000);
        expect(mocks.carregarEquipamentos).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(60_000);
        expect(mocks.obterEstadoSync).toHaveBeenLastCalledWith(cursorInicial('10'));
        expect(mocks.carregarEquipamentos).toHaveBeenCalledTimes(2);
    });

    it('API sem /sync/estado (404): recarga completa, pausa o polling, recarrega ao voltar (max 1x/min) e tenta de novo apos 5 min', async () => {
        mocks.obterEstadoSync.mockRejectedValue(erroApi(404));
        await iniciar();

        todosOsLoaders().forEach((loader) => expect(loader).toHaveBeenCalledTimes(1));
        todosOsLoaders().forEach((loader) => expect(loader).toHaveBeenCalledWith({ passivo: true }));
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(4 * 60_000);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(1);
        expect(mocks.carregarEquipamentos).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new Event('focus'));
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.carregarEquipamentos).toHaveBeenCalledTimes(2); // passou mais de 1 min desde a ultima

        window.dispatchEvent(new Event('focus'));
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.carregarEquipamentos).toHaveBeenCalledTimes(2); // limitado a 1x/min
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(1);

        // apos a espera de 5 min, volta a consultar /sync/estado (o 404 pode ter sido momentaneo)
        await vi.advanceTimersByTimeAsync(61_000);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(2);
        expect(mocks.carregarEquipamentos).toHaveBeenCalledTimes(3);
    });

    it('apos um 404 momentaneo, o polling volta quando /sync/estado responde', async () => {
        mocks.obterEstadoSync.mockRejectedValueOnce(erroApi(404));
        await iniciar();
        mocks.obterEstadoSync.mockResolvedValue(estado([], '40'));
        await vi.advanceTimersByTimeAsync(liveSync.ESPERA_APOS_404_MS);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(30_000);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(3);
    });

    it('API sem /sync/estado: push recarrega tudo na hora, sem o limite de 1 min', async () => {
        mocks.obterEstadoSync.mockRejectedValue(erroApi(404));
        await iniciar();
        expect(mocks.carregarEquipamentos).toHaveBeenCalledTimes(1);

        await liveSync.atualizarAgora();
        expect(mocks.carregarEquipamentos).toHaveBeenCalledTimes(2);
        expect(mocks.carregarResponsaveis).toHaveBeenCalledTimes(2);
    });

    it('atualizarAgora funciona com a aba oculta (push)', async () => {
        await iniciar();
        definirVisibilidade('hidden');
        mocks.obterEstadoSync.mockClear();
        mocks.obterEstadoSync.mockResolvedValue(estado(['Emprestimo'], '30'));

        await liveSync.atualizarAgora();

        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(1);
        expect(mocks.carregarEmprestimos).toHaveBeenCalledTimes(1);
    });

    it('atualizarAgora(entidades) recarrega diretamente os stores mapeados, sem consultar o servidor', async () => {
        await iniciar();
        mocks.obterEstadoSync.mockClear();

        await liveSync.atualizarAgora(['Ocorrencia']);

        expect(mocks.obterEstadoSync).not.toHaveBeenCalled();
        expect(mocks.carregarOcorrencias).toHaveBeenCalledWith({ passivo: true });
        expect(mocks.carregarEquipamentos).toHaveBeenCalledTimes(1);
        expect(mocks.carregarEmprestimos).not.toHaveBeenCalled();
    });

    it('cursor do servidor menor que o local (banco restaurado): recarga completa na hora', async () => {
        mocks.obterEstadoSync.mockResolvedValueOnce(estado([], '100'));
        await iniciar();
        mocks.obterEstadoSync.mockResolvedValueOnce(estado([], '7'));
        await vi.advanceTimersByTimeAsync(30_000);
        todosOsLoaders().forEach((loader) => expect(loader).toHaveBeenCalledTimes(1));
        expect(mocks.obterEstadoSync).toHaveBeenLastCalledWith(cursorInicial('100'));

        mocks.obterEstadoSync.mockResolvedValueOnce(estado([], '7'));
        await vi.advanceTimersByTimeAsync(30_000);
        expect(mocks.obterEstadoSync).toHaveBeenLastCalledWith('7');
    });

    it('recarga completa silenciosa de seguranca a cada 5 min', async () => {
        await iniciar();
        await vi.advanceTimersByTimeAsync(4 * 60_000);
        todosOsLoaders().forEach((loader) => expect(loader).not.toHaveBeenCalled());

        await vi.advanceTimersByTimeAsync(60_000 + 30_000);
        todosOsLoaders().forEach((loader) => expect(loader).toHaveBeenCalledTimes(1));
    });

    it('para o polling no logout e volta a consultar (com novo cursor) no proximo login', async () => {
        await iniciar();
        mocks.obterEstadoSync.mockClear();

        mocks.autenticado = false;
        mocks.authListeners.forEach((listener) => listener({ autenticado: false, usuario: null }));
        await vi.advanceTimersByTimeAsync(5 * 60_000);
        expect(mocks.obterEstadoSync).not.toHaveBeenCalled();

        mocks.autenticado = true;
        mocks.authListeners.forEach((listener) => listener({ autenticado: true, usuario: { id: 1 } }));
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.obterEstadoSync).toHaveBeenCalledTimes(1);
        expect(mocks.obterEstadoSync).toHaveBeenLastCalledWith(undefined);
    });

    it('convidado: nao consulta /sync/estado nem busca responsaveis; recarrega os publicos ao voltar (max 1x/min)', async () => {
        mocks.autenticado = false;
        liveSync.iniciarLiveSync();
        await vi.advanceTimersByTimeAsync(5 * 60_000);
        expect(mocks.obterEstadoSync).not.toHaveBeenCalled();
        expect(mocks.carregarEquipamentos).not.toHaveBeenCalled();

        definirVisibilidade('hidden');
        definirVisibilidade('visible');
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.carregarEquipamentos).toHaveBeenCalledTimes(1);
        expect(mocks.carregarEmprestimos).toHaveBeenCalledTimes(1);
        expect(mocks.carregarOcorrencias).toHaveBeenCalledTimes(1);
        expect(mocks.carregarResponsaveis).not.toHaveBeenCalled();

        definirVisibilidade('hidden');
        definirVisibilidade('visible');
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.carregarEquipamentos).toHaveBeenCalledTimes(1);
        expect(mocks.obterEstadoSync).not.toHaveBeenCalled();
    });

    it('ignora a resposta de uma sessao antiga (versao dos dados mudou durante a consulta)', async () => {
        await iniciar();
        mocks.obterEstadoSync.mockClear();
        const pendente = deferred<ReturnType<typeof estado>>();
        mocks.obterEstadoSync.mockReturnValueOnce(pendente.promise);

        const execucao = liveSync.atualizarAgora();
        await vi.advanceTimersByTimeAsync(0);
        sessao.advanceSessionDataVersion();
        pendente.resolve(estado(['Emprestimo', 'Equipamento'], '99'));
        await execucao;

        todosOsLoaders().forEach((loader) => expect(loader).not.toHaveBeenCalled());

        // o cursor da resposta descartada nao foi adotado
        await vi.advanceTimersByTimeAsync(30_000);
        expect(mocks.obterEstadoSync).toHaveBeenLastCalledWith(cursorInicial('10'));
    });

    it('ignora a resposta de uma sessao antiga (troca de usuario durante a consulta)', async () => {
        await iniciar();
        mocks.obterEstadoSync.mockClear();
        const pendente = deferred<ReturnType<typeof estado>>();
        mocks.obterEstadoSync.mockReturnValueOnce(pendente.promise);

        const execucao = liveSync.atualizarAgora();
        await vi.advanceTimersByTimeAsync(0);
        mocks.authListeners.forEach((listener) => listener({ autenticado: true, usuario: { id: 2 } }));
        pendente.resolve(estado(['Responsavel'], '55'));
        await execucao;
        await vi.advanceTimersByTimeAsync(0);

        expect(mocks.carregarResponsaveis).not.toHaveBeenCalled();
    });
});
