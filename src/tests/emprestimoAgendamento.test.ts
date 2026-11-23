// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => localStorage.setItem('eduassets_lang', 'pt'));

const mocks = vi.hoisted(() => ({
    equipamentos: [] as unknown[],
    loans: [] as unknown[],
    confirmarAcao: vi.fn(),
    criarDataHoraPicker: vi.fn()
}));

vi.mock('../core/state/equipamentoStore.js', () => ({ getEquipamentos: () => mocks.equipamentos, subscribe: () => () => undefined }));
vi.mock('../core/state/loanStore.js', () => ({ getLoansAtivos: () => mocks.loans, addLoan: vi.fn() }));
vi.mock('../core/state/ocorrenciasStore.js', () => ({ getOcorrenciasPorTipo: () => [] }));
vi.mock('../core/ui/confirm.js', () => ({ confirmarAcao: mocks.confirmarAcao }));
vi.mock('../core/ui/datepicker.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../core/ui/datepicker.js')>()),
    criarDataHoraPicker: mocks.criarDataHoraPicker
}));

import { ApiError } from '../core/api/apiClient.js';
import { registrarComFluxo, solicitarNovaJanela, verificarDisponibilidade } from '../features/emprestimo/agendamento.js';
import { adicionarItemComValidacao } from '../features/emprestimo/service.js';
import { atualizarRotuloSubmit } from '../features/emprestimo/events.js';
import type { LoanDraft } from '../types/index.js';

const AGORA = new Date(2026, 10, 23, 9, 0, 0, 0);
const H = 3_600_000;
const FIM_DO_DIA = new Date(2026, 10, 23, 23, 59, 0, 0);
const em = (horas: number): Date => new Date(AGORA.getTime() + horas * H);

function equipamento(id: number, modelo: string, total: number, disponivel: number) {
    return { id, modelo, categoria: { nome: 'Informática' }, quantidadeTotal: total, quantidadeQuebrada: 0, quantidadeDisponivel: disponivel };
}

function emprestimoAberto(id: number, quantidade: number, previstaH: number | null) {
    return {
        id, status: 'aberto', data: em(-1).toISOString(), dataAgendada: null,
        dataPrevistaDevolucao: previstaH === null ? null : em(previstaH).toISOString(),
        itens: [{ id: 1, nome: 'Notebook', quantidade }]
    };
}

function rascunho(quantidade: number, extra: Partial<LoanDraft> = {}): LoanDraft {
    return { aluno: 'Ana', responsavelId: '1', itens: [{ id: '1', nome: 'Notebook', quantidade }], ...extra };
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
    mocks.equipamentos = [equipamento(1, 'Notebook', 5, 5), equipamento(2, 'Cabo', 1, 0)];
    mocks.loans = [];
    mocks.confirmarAcao.mockReset();
    mocks.criarDataHoraPicker.mockReset().mockImplementation(async (_input: unknown, opcoes: { defaultDate?: Date | null }) => ({
        selectedDates: opcoes.defaultDate ? [opcoes.defaultDate] : [],
        setDate: vi.fn(),
        destroy: vi.fn()
    }));
});

afterEach(() => {
    vi.useRealTimers();
});

describe('botão de envio: Agendar', () => {
    function montar() {
        document.body.innerHTML = `<form><input id="data" class="input-auto"><button class="registrar-emprestimo" data-i18n-key="emprestimo.registrar_emprestimo"><span class="material-symbols-outlined">check</span>Registrar Empréstimo</button></form>`;
        const dataInput = document.getElementById('data') as HTMLInputElement;
        const btnSubmit = document.querySelector('button') as HTMLButtonElement;
        const picker = { selectedDates: [] as Date[] };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { dataInput, btnSubmit, picker: picker as any };
    }

    it('retirada automática ou até 5 min à frente: rótulo normal', () => {
        const els = montar();
        atualizarRotuloSubmit(els);
        expect(els.btnSubmit.textContent).toContain('Registrar Empréstimo');

        els.dataInput.classList.remove('input-auto');
        els.picker.selectedDates = [new Date(AGORA.getTime() + 5 * 60_000)];
        atualizarRotuloSubmit(els);
        expect(els.btnSubmit.textContent).toContain('Registrar Empréstimo');
        expect(els.btnSubmit.dataset.agendar).toBe('false');
    });

    it('retirada a mais de 5 min no futuro: "Agendar"; voltando ao presente, volta o rótulo', () => {
        const els = montar();
        els.dataInput.classList.remove('input-auto');
        els.picker.selectedDates = [new Date(AGORA.getTime() + 6 * 60_000)];
        atualizarRotuloSubmit(els);
        expect(els.btnSubmit.textContent).toContain('Agendar');
        expect(els.btnSubmit.textContent).not.toContain('Registrar');
        expect(els.btnSubmit.dataset.i18nKey).toBe('emprestimo.agendar');
        expect(els.btnSubmit.querySelector('.material-symbols-outlined')?.textContent).toBe('event');

        els.picker.selectedDates = [AGORA];
        atualizarRotuloSubmit(els);
        expect(els.btnSubmit.textContent).toContain('Registrar Empréstimo');
        expect(els.btnSubmit.querySelector('.material-symbols-outlined')?.textContent).toBe('check');
    });

    it('funciona com o botão em estado de carregamento (rótulo dentro de .btn-label)', () => {
        const els = montar();
        els.btnSubmit.innerHTML = '<span class="btn-label" data-i18n-key="emprestimo.registrar_emprestimo"><span class="material-symbols-outlined">check</span>Registrar Empréstimo</span><span class="btn-spinner"></span>';
        els.dataInput.classList.remove('input-auto');
        els.picker.selectedDates = [em(24)];
        atualizarRotuloSubmit(els);
        expect(els.btnSubmit.querySelector('.btn-label')?.textContent).toContain('Agendar');
        expect(els.btnSubmit.querySelector<HTMLElement>('.btn-label')?.dataset.i18nKey).toBe('emprestimo.agendar');
    });
});

describe('adicionar item: até a capacidade, com aviso', () => {
    it('acima do disponível agora mas dentro da capacidade: ok com aviso', () => {
        mocks.equipamentos = [equipamento(1, 'Notebook', 5, 2)];
        const r = adicionarItemComValidacao([], { id: '1', nome: 'Notebook', quantidade: 4 });
        expect(r.ok).toBe(true);
        expect(r.itens[0].quantidade).toBe(4);
        expect(r.aviso).toBe('Só 2 disponíveis agora.');
    });

    it('dentro do disponível agora: sem aviso', () => {
        mocks.equipamentos = [equipamento(1, 'Notebook', 5, 2)];
        const r = adicionarItemComValidacao([], { id: '1', nome: 'Notebook', quantidade: 2 });
        expect(r.ok).toBe(true);
        expect(r.aviso).toBeUndefined();
    });

    it('soma o que já estava na lista e bloqueia acima da capacidade', () => {
        mocks.equipamentos = [equipamento(1, 'Notebook', 5, 2)];
        const base = [{ id: '1', nome: 'Notebook', quantidade: 3 }];
        expect(adicionarItemComValidacao(base, { id: '1', nome: 'Notebook', quantidade: 2 }).ok).toBe(true);
        const r = adicionarItemComValidacao(base, { id: '1', nome: 'Notebook', quantidade: 3 });
        expect(r.ok).toBe(false);
        expect(r.erro).toContain('Notebook');
    });
});

describe('verificarDisponibilidade', () => {
    it('ok / insuficiente (cabe na capacidade) / além da capacidade', () => {
        mocks.loans = [emprestimoAberto(1, 4, 3)];
        mocks.equipamentos = [equipamento(1, 'Notebook', 5, 1)];
        const janela = [AGORA, FIM_DO_DIA] as const;
        expect(verificarDisponibilidade(rascunho(1).itens, ...janela, true).situacao).toBe('ok');
        const insuf = verificarDisponibilidade(rascunho(3).itens, ...janela, true);
        expect(insuf.situacao).toBe('insuficiente');
        expect(insuf.itensFaltantes[0]).toMatchObject({ nome: 'Notebook', solicitado: 3, disponivel: 1 });
        expect(verificarDisponibilidade(rascunho(6).itens, ...janela, true).situacao).toBe('alem_capacidade');
    });
});

describe('modal 1: agendamento futuro', () => {
    const inicio = em(24);
    const fim = em(25);
    const entrada = () => ({
        dados: rascunho(2, { dataRetiradaISO: inicio.toISOString(), dataPrevistaDevolucaoISO: fim.toISOString() }),
        inicio, fim, agendando: true
    });

    it('Sim envia o agendamento', async () => {
        mocks.confirmarAcao.mockResolvedValue(true);
        const enviar = vi.fn(async () => undefined);
        const r = await registrarComFluxo(entrada(), enviar);

        const opcoes = mocks.confirmarAcao.mock.calls[0][0];
        expect(opcoes.titulo).toBe('Gostaria de agendar o uso desses equipamentos?');
        expect(opcoes.variante).toBe('info');
        expect(opcoes.detalhesHtml).toContain('2x Notebook');
        expect(opcoes.detalhesHtml).toContain('modal-summary-panel');
        expect(enviar).toHaveBeenCalledTimes(1);
        expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ dataRetiradaISO: inicio.toISOString(), dataPrevistaDevolucaoISO: fim.toISOString() }));
        expect(r).toEqual({ tipo: 'registrado', agendado: true, inicio });
    });

    it('Não volta ao formulário sem enviar nada', async () => {
        mocks.confirmarAcao.mockResolvedValue(false);
        const enviar = vi.fn();
        const r = await registrarComFluxo(entrada(), enviar);
        expect(r).toEqual({ tipo: 'cancelado' });
        expect(enviar).not.toHaveBeenCalled();
    });
});

describe('modal 2: indisponível agora', () => {
    // 4 de 5 notebooks estão fora até daqui a 3 h; o pedido de 3 não cabe agora, mas cabe na capacidade.
    beforeEach(() => {
        mocks.equipamentos = [equipamento(1, 'Notebook', 5, 1)];
        mocks.loans = [emprestimoAberto(1, 4, 3)];
    });
    const imediata = (quantidade = 3) => ({
        dados: rascunho(quantidade, { dataPrevistaDevolucaoISO: FIM_DO_DIA.toISOString() }),
        inicio: AGORA, fim: FIM_DO_DIA, agendando: false
    });

    /** Simula o modal: abre (aoAbrir) e devolve a janela dada. */
    function simularModal2(janela: { inicio: Date; fim: Date } | null) {
        mocks.confirmarAcao.mockImplementationOnce(async (opcoes) => {
            const container = document.createElement('div');
            container.innerHTML = opcoes.conteudo.html;
            opcoes.conteudo.aoAbrir(container);
            await vi.waitFor(() => expect(mocks.criarDataHoraPicker).toHaveBeenCalledTimes(2));
            return janela;
        });
    }

    it('pela checagem do cliente: abre o modal 2 com a sugestão e agenda na janela escolhida', async () => {
        const escolhida = { inicio: em(3), fim: em(4) };
        simularModal2(escolhida);
        const enviar = vi.fn(async () => undefined);
        const r = await registrarComFluxo(imediata(), enviar);

        const opcoes = mocks.confirmarAcao.mock.calls[0][0];
        expect(opcoes.titulo).toBe('O número de equipamentos solicitado não está disponível. Gostaria de realizar um agendamento?');
        expect(opcoes.variante).toBe('warning');
        // Pré-preenchimento: o próximo horário livre (quando os 4 notebooks voltam, +3 h).
        expect(mocks.criarDataHoraPicker).toHaveBeenCalledTimes(2);
        expect(mocks.criarDataHoraPicker.mock.calls[0][1].defaultDate.getTime()).toBe(em(3).getTime());

        expect(enviar).toHaveBeenCalledWith(expect.objectContaining({
            dataRetiradaISO: escolhida.inicio.toISOString(), dataPrevistaDevolucaoISO: escolhida.fim.toISOString()
        }));
        expect(r).toEqual({ tipo: 'registrado', agendado: true, inicio: escolhida.inicio });
    });

    it('cancelar o modal 2 não envia nada', async () => {
        simularModal2(null);
        const enviar = vi.fn();
        expect(await registrarComFluxo(imediata(), enviar)).toEqual({ tipo: 'cancelado' });
        expect(enviar).not.toHaveBeenCalled();
    });

    it('além da capacidade: erro (toast), sem modal e sem envio', async () => {
        const enviar = vi.fn();
        const r = await registrarComFluxo(imediata(6), enviar);
        expect(r.tipo).toBe('erro');
        expect(r.tipo === 'erro' && r.mensagem).toContain('Notebook');
        expect(mocks.confirmarAcao).not.toHaveBeenCalled();
        expect(enviar).not.toHaveBeenCalled();
    });

    it('pelo servidor: EstoqueInsuficiente agendavel abre o modal 2 com proximoHorarioLivre e reenvia', async () => {
        mocks.equipamentos = [equipamento(1, 'Notebook', 5, 5)]; // o cliente achava que estava livre
        mocks.loans = [];
        const sugerido = em(5);
        const recusa = new ApiError('Estoque insuficiente', 400, {
            erro: 'backend.emprestimos.estoque_insuficiente', itens: [], agendavel: true, proximoHorarioLivre: sugerido.toISOString()
        });
        const enviar = vi.fn().mockRejectedValueOnce(recusa).mockResolvedValueOnce(undefined);
        const escolhida = { inicio: sugerido, fim: new Date(sugerido.getTime() + H) };
        simularModal2(escolhida);

        const r = await registrarComFluxo(imediata(2), enviar);

        expect(enviar).toHaveBeenCalledTimes(2);
        expect(mocks.criarDataHoraPicker.mock.calls[0][1].defaultDate.getTime()).toBe(sugerido.getTime());
        expect(enviar.mock.calls[1][0]).toMatchObject({ dataRetiradaISO: escolhida.inicio.toISOString() });
        expect(r).toMatchObject({ tipo: 'registrado', agendado: true });
    });

    it('servidor agendavel sem proximoHorarioLivre: campos vazios', async () => {
        mocks.equipamentos = [equipamento(1, 'Notebook', 5, 5)];
        mocks.loans = [];
        const recusa = new ApiError('x', 400, { itens: [], agendavel: true, proximoHorarioLivre: null });
        const enviar = vi.fn().mockRejectedValueOnce(recusa);
        simularModal2(null);
        await registrarComFluxo(imediata(2), enviar);
        expect(mocks.criarDataHoraPicker.mock.calls[0][1].defaultDate).toBeNull();
    });

    it('servidor recusa sem agendavel: vira erro, sem modal', async () => {
        mocks.equipamentos = [equipamento(1, 'Notebook', 5, 5)];
        mocks.loans = [];
        const recusa = new ApiError('Estoque insuficiente', 400, {
            itens: [{ equipamentoId: 1, nome: 'Notebook', categoria: 'x', solicitado: 9, disponivel: 5 }], agendavel: false
        });
        const r = await registrarComFluxo(imediata(2), vi.fn().mockRejectedValue(recusa));
        expect(r.tipo).toBe('erro');
        expect(mocks.confirmarAcao).not.toHaveBeenCalled();
    });

    it('agendamento futuro sem unidades na janela vai direto ao modal 2 (não ao modal 1)', async () => {
        // O agendamento começa em 1 h, enquanto os 4 notebooks só voltam em 3 h.
        simularModal2(null);
        const inicio = em(1);
        await registrarComFluxo({
            dados: rascunho(3, { dataRetiradaISO: inicio.toISOString() }), inicio, fim: em(2), agendando: true
        }, vi.fn());
        expect(mocks.confirmarAcao.mock.calls[0][0].titulo).toContain('não está disponível');
    });
});

describe('validação do modal 2', () => {
    it('exige início entre agora+5min e agora+15d e fim depois do início', async () => {
        document.body.innerHTML = '<div id="c"></div>';
        mocks.criarDataHoraPicker.mockReset();
        let validar!: (c: HTMLElement) => boolean;
        mocks.confirmarAcao.mockImplementationOnce((opcoes) => {
            validar = opcoes.conteudo.validar;
            const c = document.getElementById('c') as HTMLElement;
            c.innerHTML = opcoes.conteudo.html;
            opcoes.conteudo.aoAbrir(c);
            return new Promise(() => undefined);
        });
        const pickers: Array<{ selectedDates: Date[] }> = [];
        mocks.criarDataHoraPicker.mockImplementation(async () => {
            const p = { selectedDates: [] as Date[], setDate: vi.fn(), destroy: vi.fn() };
            pickers.push(p);
            return p;
        });
        void solicitarNovaJanela({ inicio: null, fim: null });
        await vi.waitFor(() => expect(pickers).toHaveLength(2));
        // Aguarda o fim da criação dos dois pickers (atribuição às variáveis internas).
        await Promise.resolve();
        await Promise.resolve();
        const c = document.getElementById('c') as HTMLElement;
        const [pInicio, pFim] = pickers;

        expect(validar(c)).toBe(false); // vazio
        expect(document.getElementById('agendamento-inicio-field-error')?.textContent).toContain('Informe o início');

        pInicio.selectedDates = [em(0)];
        pFim.selectedDates = [em(2)];
        expect(validar(c)).toBe(false);
        expect(document.getElementById('agendamento-inicio-field-error')?.textContent).toContain('5 minutos');

        pInicio.selectedDates = [em(24 * 16)];
        pFim.selectedDates = [em(24 * 16 + 1)];
        expect(validar(c)).toBe(false);
        expect(document.getElementById('agendamento-inicio-field-error')?.textContent).toContain('15 dias');

        pInicio.selectedDates = [em(2)];
        pFim.selectedDates = [em(2)];
        expect(validar(c)).toBe(false);
        expect(document.getElementById('agendamento-fim-field-error')?.textContent).toContain('depois do início');

        pFim.selectedDates = [em(3)];
        expect(validar(c)).toBe(true);
    });
});
