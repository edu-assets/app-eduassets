// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => localStorage.setItem('eduassets_lang', 'pt'));

const mocks = vi.hoisted(() => ({
    equipamentos: [] as unknown[],
    loans: [] as unknown[],
    addLoan: vi.fn(),
    showToast: vi.fn(),
    confirmarAcao: vi.fn(),
    criarDataHoraPicker: vi.fn()
}));

vi.mock('../core/state/equipamentoStore.js', () => ({ getEquipamentos: () => mocks.equipamentos, subscribe: () => () => undefined }));
vi.mock('../core/state/loanStore.js', () => ({ getLoansAtivos: () => mocks.loans, addLoan: mocks.addLoan }));
vi.mock('../core/auth/guestGate.js', () => ({ bloquearSeConvidado: () => false }));
vi.mock('../core/ui/index.js', () => ({ showToast: mocks.showToast, openModal: vi.fn() }));
vi.mock('../core/state/ocorrenciasStore.js', () => ({ getOcorrenciasPorTipo: () => [] }));
vi.mock('../core/ui/confirm.js', () => ({ confirmarAcao: mocks.confirmarAcao }));
vi.mock('../core/ui/datepicker.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../core/ui/datepicker.js')>()),
    criarDataHoraPicker: mocks.criarDataHoraPicker
}));

import { ApiError } from '../core/api/apiClient.js';
import { registrarComFluxo, solicitarAgendamento, verificarDisponibilidade } from '../features/emprestimo/agendamento.js';
import { adicionarItemComValidacao } from '../features/emprestimo/service.js';
import { atualizarRotuloSubmit, attachEmprestimoEvents, devolucaoPrevistaImediata } from '../features/emprestimo/events.js';
import indexHtml from '../../index.html?raw';
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

/** Entrada de retirada imediata: devolução prevista = fim do dia, sem retirada. */
const imediata = (quantidade = 3) => ({
    dados: rascunho(quantidade, { dataPrevistaDevolucaoISO: FIM_DO_DIA.toISOString() }),
    inicioFuturo: null
});

/** Simula o modal: abre (aoAbrir, criando os dois pickers) e devolve a janela dada (null = cancelou). */
function simularModal(janela: { inicio: Date; fim: Date } | null) {
    mocks.confirmarAcao.mockImplementationOnce(async (opcoes) => {
        const container = document.createElement('div');
        container.innerHTML = opcoes.conteudo.html;
        opcoes.conteudo.aoAbrir(container);
        await vi.waitFor(() => expect(mocks.criarDataHoraPicker).toHaveBeenCalledTimes(2));
        return janela;
    });
}

describe('formulário sem "Devolução prevista"', () => {
    it('o painel de empréstimo não tem o campo', () => {
        expect(indexHtml).not.toContain('devolucao-prevista-emprestimo');
    });

    it('devolução prevista imediata = 23:59 do dia local', () => {
        expect(devolucaoPrevistaImediata(AGORA).getTime()).toBe(FIM_DO_DIA.getTime());
    });

    it('envio imediato leva o fim do dia como prevista, sem modal', async () => {
        document.body.innerHTML = `<form id="f"><input id="data" class="input-auto"><select id="eq"><option value="1" selected>Notebook</option></select>
            <input id="qtd" value="1"><button type="button" id="add"></button><div id="lista"></div><div id="lista-modal"></div>
            <select id="resp"><option value="1" selected>R</option></select><input id="sol" value="Ana"><textarea id="obs"></textarea>
            <button class="registrar-emprestimo" type="submit"><span class="material-symbols-outlined">check</span>Registrar Empréstimo</button></form>`;
        const g = (id: string) => document.getElementById(id) as HTMLElement;
        mocks.addLoan.mockResolvedValue({});
        const estado = { itens: [{ id: '1', nome: 'Notebook', quantidade: 2 }] };
        attachEmprestimoEvents({
            form: g('f') as HTMLFormElement, dataInput: g('data') as HTMLInputElement, equipamentoSelect: g('eq') as HTMLSelectElement,
            quantidadeInput: g('qtd') as HTMLInputElement, btnAdicionar: g('add') as HTMLButtonElement, itensList: g('lista'), itensCount: null,
            modalItensLista: g('lista-modal'), responsavelSelect: g('resp') as HTMLSelectElement, solicitanteInput: g('sol') as HTMLInputElement,
            observacaoInput: g('obs') as HTMLTextAreaElement, btnSubmit: document.querySelector('.registrar-emprestimo') as HTMLButtonElement,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            picker: { selectedDates: [], setDate: vi.fn() } as any
        }, estado);
        g('f').dispatchEvent(new Event('submit', { cancelable: true }));
        await vi.waitFor(() => expect(mocks.addLoan).toHaveBeenCalledTimes(1));
        const enviado = mocks.addLoan.mock.calls[0][0] as LoanDraft;
        expect(enviado.dataPrevistaDevolucaoISO).toBe(FIM_DO_DIA.toISOString());
        expect(enviado.dataRetiradaISO).toBeUndefined();
        expect(mocks.confirmarAcao).not.toHaveBeenCalled();
    });

    it('registrarComFluxo imediato com estoque: envia direto, sem modal', async () => {
        const enviar = vi.fn(async () => undefined);
        const r = await registrarComFluxo(imediata(2), enviar);
        expect(mocks.confirmarAcao).not.toHaveBeenCalled();
        expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ dataPrevistaDevolucaoISO: FIM_DO_DIA.toISOString() }));
        expect(r.tipo === 'registrado' && r.agendado).toBe(false);
    });
});

describe('modal único: retirada futura', () => {
    const inicio = em(24);
    const entrada = () => ({ dados: rascunho(2, { dataRetiradaISO: inicio.toISOString(), dataPrevistaDevolucaoISO: FIM_DO_DIA.toISOString() }), inicioFuturo: inicio });

    it('abre com o início escolhido, fim = início + 1 h, aviso e itens; confirmar agenda na janela do modal', async () => {
        const escolhida = { inicio: em(25), fim: em(27) };
        simularModal(escolhida);
        const enviar = vi.fn(async () => undefined);
        const r = await registrarComFluxo(entrada(), enviar);

        const opcoes = mocks.confirmarAcao.mock.calls[0][0];
        expect(opcoes.titulo).toBe('Gostaria de agendar o uso desses equipamentos?');
        expect(opcoes.rotuloConfirmar).toBe('emprestimo.agendar');
        expect(opcoes.conteudo.html).toContain('modal-callout-info');
        expect(opcoes.conteudo.html).toContain('Os equipamentos ficarão reservados para este horário.');
        expect(opcoes.conteudo.html).toContain('2x Notebook');
        const [pInicio, pFim] = mocks.criarDataHoraPicker.mock.calls.map((c) => c[1].defaultDate as Date);
        expect(pInicio.getTime()).toBe(inicio.getTime());
        expect(pFim.getTime()).toBe(inicio.getTime() + H);

        expect(enviar).toHaveBeenCalledTimes(1);
        expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ dataRetiradaISO: escolhida.inicio.toISOString(), dataPrevistaDevolucaoISO: escolhida.fim.toISOString() }));
        expect(r).toEqual({ tipo: 'registrado', agendado: true, inicio: escolhida.inicio });
    });

    it('cancelar volta ao formulário sem enviar nada', async () => {
        simularModal(null);
        const enviar = vi.fn();
        expect(await registrarComFluxo(entrada(), enviar)).toEqual({ tipo: 'cancelado' });
        expect(enviar).not.toHaveBeenCalled();
    });

    it('sem unidades na janela: o mesmo modal, com o título de estoque', async () => {
        mocks.equipamentos = [equipamento(1, 'Notebook', 5, 1)];
        mocks.loans = [emprestimoAberto(1, 4, 30)];
        simularModal(null);
        await registrarComFluxo({ dados: rascunho(3, { dataRetiradaISO: em(1).toISOString() }), inicioFuturo: em(1) }, vi.fn());
        expect(mocks.confirmarAcao).toHaveBeenCalledTimes(1);
        expect(mocks.confirmarAcao.mock.calls[0][0].titulo).toContain('não está disponível');
    });
});

describe('modal único: indisponível agora', () => {
    // 4 de 5 notebooks estão fora até daqui a 3 h; o pedido de 3 não cabe agora, mas cabe na capacidade.
    beforeEach(() => {
        mocks.equipamentos = [equipamento(1, 'Notebook', 5, 1)];
        mocks.loans = [emprestimoAberto(1, 4, 3)];
    });

    it('pela checagem do cliente: título de estoque, início sugerido, fim +1 h, agenda na janela escolhida', async () => {
        const escolhida = { inicio: em(3), fim: em(4) };
        simularModal(escolhida);
        const enviar = vi.fn(async () => undefined);
        const r = await registrarComFluxo(imediata(), enviar);

        const opcoes = mocks.confirmarAcao.mock.calls[0][0];
        expect(opcoes.titulo).toBe('O número de equipamentos solicitado não está disponível. Gostaria de realizar um agendamento?');
        expect(opcoes.variante).toBe('warning');
        expect(opcoes.conteudo.html).toContain('modal-callout-info');
        expect(mocks.criarDataHoraPicker.mock.calls[0][1].defaultDate.getTime()).toBe(em(3).getTime());
        expect(mocks.criarDataHoraPicker.mock.calls[1][1].defaultDate.getTime()).toBe(em(4).getTime());
        expect(enviar).toHaveBeenCalledWith(expect.objectContaining({
            dataRetiradaISO: escolhida.inicio.toISOString(), dataPrevistaDevolucaoISO: escolhida.fim.toISOString()
        }));
        expect(r).toEqual({ tipo: 'registrado', agendado: true, inicio: escolhida.inicio });
    });

    it('cancelar não envia nada', async () => {
        simularModal(null);
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

    it('pelo servidor: EstoqueInsuficiente agendavel abre o mesmo modal com proximoHorarioLivre e reenvia', async () => {
        mocks.equipamentos = [equipamento(1, 'Notebook', 5, 5)]; // o cliente achava que estava livre
        mocks.loans = [];
        const sugerido = em(5);
        const recusa = new ApiError('Estoque insuficiente', 400, {
            erro: 'backend.emprestimos.estoque_insuficiente', itens: [], agendavel: true, proximoHorarioLivre: sugerido.toISOString()
        });
        const enviar = vi.fn().mockRejectedValueOnce(recusa).mockResolvedValueOnce(undefined);
        const escolhida = { inicio: sugerido, fim: new Date(sugerido.getTime() + H) };
        simularModal(escolhida);

        const r = await registrarComFluxo(imediata(2), enviar);

        expect(mocks.confirmarAcao.mock.calls[0][0].titulo).toContain('não está disponível');
        expect(enviar).toHaveBeenCalledTimes(2);
        expect(mocks.criarDataHoraPicker.mock.calls[0][1].defaultDate.getTime()).toBe(sugerido.getTime());
        expect(enviar.mock.calls[1][0]).toMatchObject({ dataRetiradaISO: escolhida.inicio.toISOString() });
        expect(r).toMatchObject({ tipo: 'registrado', agendado: true });
    });

    it('servidor agendavel sem proximoHorarioLivre: campos vazios', async () => {
        mocks.equipamentos = [equipamento(1, 'Notebook', 5, 5)];
        mocks.loans = [];
        const recusa = new ApiError('x', 400, { itens: [], agendavel: true, proximoHorarioLivre: null });
        simularModal(null);
        await registrarComFluxo(imediata(2), vi.fn().mockRejectedValueOnce(recusa));
        expect(mocks.criarDataHoraPicker.mock.calls[0][1].defaultDate).toBeNull();
        expect(mocks.criarDataHoraPicker.mock.calls[1][1].defaultDate).toBeNull();
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
});

describe('validação do modal de agendamento', () => {
    it('exige início entre agora+5min e agora+15d e fim depois do início; erros mantêm o modal aberto', async () => {
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
        void solicitarAgendamento('indisponivel', null, rascunho(1).itens);
        await vi.waitFor(() => expect(pickers).toHaveLength(2));
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

        pFim.selectedDates = [em(2 + 24 * 15 + 1)];
        expect(validar(c)).toBe(false);
        expect(document.getElementById('agendamento-fim-field-error')?.textContent).toContain('15 dias');

        pFim.selectedDates = [em(3)];
        expect(validar(c)).toBe(true);
    });
});
