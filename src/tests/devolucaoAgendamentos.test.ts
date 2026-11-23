// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import indexHtml from '../../index.html?raw';
import type { LoanUI } from '../types/index.js';

const m = vi.hoisted(() => ({
    abertos: [] as unknown[],
    agendados: [] as unknown[],
    listeners: [] as Array<() => void>,
    confirmarAcao: vi.fn(),
    showToast: vi.fn(),
    confirmarRetirada: vi.fn(),
    excluirAgendamento: vi.fn()
}));

vi.mock('../core/ui/index.js', () => ({
    criarDataAutoPicker: async () => ({ selectedDates: [], config: { dateFormat: '' }, formatDate: () => '' }),
    showToast: m.showToast, closeModal: vi.fn(), openModal: vi.fn(), confirmarAcao: m.confirmarAcao
}));
vi.mock('../core/ui/datepicker.js', () => ({ definirAgora: vi.fn() }));
vi.mock('../core/state/equipamentoStore.js', () => ({ getEquipamentos: () => [], subscribe: vi.fn() }));
vi.mock('../core/state/loadStatus.js', () => ({ getLoadStatus: () => ({ status: 'pronto' }), subscribeLoadStatus: vi.fn(), tentarNovamente: vi.fn() }));
vi.mock('../core/state/liveSync.js', () => ({ atualizarAgora: vi.fn() }));
vi.mock('../core/auth/guestGate.js', () => ({ bloquearSeConvidado: () => false }));
vi.mock('../core/state/loanStore.js', () => ({
    getLoansAbertos: () => m.abertos,
    getAgendamentos: () => m.agendados,
    getLoansAtivos: () => [...m.abertos, ...m.agendados],
    subscribe: (cb: () => void) => { m.listeners.push(cb); return () => undefined; },
    confirmarRetirada: (...a: unknown[]) => m.confirmarRetirada(...a),
    excluirAgendamento: (...a: unknown[]) => m.excluirAgendamento(...a),
    returnLoan: vi.fn(), updateLoan: vi.fn()
}));

import { definirIdioma } from '../core/state/i18nStore.js';
import { ApiError } from '../core/api/apiClient.js';
import { estadoAgendamento, ANTECEDENCIA_CONFIRMACAO_MS } from '../features/devolucao/agendamento.js';
import { initDevolucao, INTERVALO_ATUALIZACAO_AGENDAMENTOS_MS } from '../features/devolucao/index.js';

const painelHtml = indexHtml.slice(indexHtml.indexOf('<section class="panel" id="panel-devolucao">'), indexHtml.indexOf('<!-- Painel 3: Dashboard -->'));

const AGORA = new Date(2026, 10, 23, 10, 0, 0);
const em = (minutos: number): Date => new Date(AGORA.getTime() + minutos * 60_000);

function aberto(id: number, aluno: string): LoanUI {
    return { id, numero: id, aluno, responsavel: 'Ana', responsavelId: 1, status: 'aberto', data: em(-60).toISOString(),
        dataAgendada: null, dataPrevistaDevolucao: null, dataDevolucao: null, observacao: '', createdAt: em(-60),
        itens: [{ id: 1, nome: 'Notebook', quantidade: 2 }] } as LoanUI;
}
/** Agendamento com início daqui a `inicioMin` minutos e duração de `duracaoMin`. */
function agendado(id: number, aluno: string, inicioMin: number, duracaoMin = 60): LoanUI {
    return { ...aberto(id, aluno), status: 'agendado', data: em(inicioMin).toISOString(), dataAgendada: em(inicioMin).toISOString(),
        dataPrevistaDevolucao: em(inicioMin + duracaoMin).toISOString(), createdAt: em(-300) } as LoanUI;
}

const lista = () => document.getElementById('lista-devolucoes-items')!;
const aba = (nome: string) => document.querySelector<HTMLElement>(`#devolucao-abas [data-tab="${nome}"]`)!;
const cards = () => Array.from(lista().querySelectorAll<HTMLElement>('.devolucao-item'));
const notificar = () => m.listeners.forEach((cb) => cb());
const esperar = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

describe('estadoAgendamento (relógio injetado)', () => {
    it('classifica Hoje / Agendado / Atrasado / Expirado', () => {
        expect(estadoAgendamento(agendado(1, 'A', 120), AGORA).situacao).toBe('hoje');
        expect(estadoAgendamento(agendado(1, 'A', 60 * 24 + 120), AGORA).situacao).toBe('agendado');
        expect(estadoAgendamento(agendado(1, 'A', -10), AGORA).situacao).toBe('atrasado');
        expect(estadoAgendamento(agendado(1, 'A', -90, 60), AGORA).situacao).toBe('expirado');
        // Exatamente no fim da janela já expirou; no instante do início ainda não está atrasado.
        expect(estadoAgendamento(agendado(1, 'A', -60, 60), AGORA).situacao).toBe('expirado');
        expect(estadoAgendamento(agendado(1, 'A', 0), AGORA).situacao).toBe('hoje');
    });

    it('janela de confirmação: de 30 min antes do início até o fim', () => {
        const pode = (inicioMin: number, dur = 60) => estadoAgendamento(agendado(1, 'A', inicioMin, dur), AGORA).podeConfirmar;
        expect(ANTECEDENCIA_CONFIRMACAO_MS).toBe(30 * 60_000);
        expect(pode(31)).toBe(false);
        expect(pode(30)).toBe(true);
        expect(pode(5)).toBe(true);
        expect(pode(-30)).toBe(true);
        expect(pode(-59)).toBe(true);
        expect(pode(-60)).toBe(false);
    });
});

describe('Devoluções: abas Em andamento / Agendamentos', () => {
    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
        vi.setSystemTime(AGORA);
        definirIdioma('pt');
        window.matchMedia = (() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
        document.body.innerHTML = painelHtml;
        m.listeners = [];
        m.abertos = [aberto(1, 'Carlos'), aberto(2, 'Dora')];
        m.agendados = [agendado(10, 'Eva', 20), agendado(11, 'Fabio', 60 * 30)];
        m.confirmarAcao.mockReset();
        m.showToast.mockReset();
        m.confirmarRetirada.mockReset();
        m.excluirAgendamento.mockReset();
        await initDevolucao();
    });
    afterEach(() => vi.useRealTimers());

    it('divide as listas e mostra a contagem de cada aba', () => {
        expect(aba('andamento').textContent).toBe('Em andamento (2)');
        expect(aba('agendamentos').textContent).toBe('Agendamentos (2)');
        expect(cards().map((c) => c.dataset.id)).toEqual(['1', '2']);
        expect(lista().querySelector('[data-agendamento]')).toBeNull();

        aba('agendamentos').click();
        expect(cards().map((c) => c.dataset.id)).toEqual(['10', '11']);
        expect(cards().every((c) => c.hasAttribute('data-agendamento'))).toBe(true);
    });

    it('abas acessíveis: tablist, aria-selected, roving tabindex e setas do teclado', () => {
        const tablist = document.getElementById('devolucao-abas')!;
        expect(tablist.getAttribute('role')).toBe('tablist');
        expect(aba('andamento').getAttribute('aria-selected')).toBe('true');
        expect(aba('agendamentos').getAttribute('tabindex')).toBe('-1');

        aba('andamento').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(aba('agendamentos').getAttribute('aria-selected')).toBe('true');
        expect(aba('agendamentos').getAttribute('tabindex')).toBe('0');
        expect(aba('andamento').getAttribute('aria-selected')).toBe('false');
        expect(lista().getAttribute('role')).toBe('tabpanel');
        expect(lista().getAttribute('aria-labelledby')).toBe('devolucao-tab-agendamentos');
    });

    it('badges por horário: Hoje, Agendado (outro dia), Atrasado e Expirado', () => {
        m.agendados = [agendado(10, 'Eva', 20), agendado(11, 'Fabio', 60 * 30), agendado(12, 'Gil', -10), agendado(13, 'Hugo', -90)];
        aba('agendamentos').click();
        const badge = (id: number) => lista().querySelector(`[data-id="${id}"] .status-badge`)!;
        expect(badge(10).textContent).toMatch(/^Hoje \d{2}:\d{2}$/);
        expect(badge(10).classList.contains('status-badge--hoje')).toBe(true);
        expect(badge(11).textContent).toBe('Agendado');
        expect(badge(12).textContent).toBe('Atrasado');
        expect(badge(13).textContent).toBe('Expirado');
        expect(badge(13).classList.contains('status-badge--expirado')).toBe(true);
    });

    it('"Confirmar retirada" só habilita dentro da janela; o relógio reavalia sem trocar de aba', () => {
        aba('agendamentos').click();
        m.agendados = [agendado(10, 'Eva', 20), agendado(14, 'Ivo', 45), agendado(15, 'Jade', -90)];
        notificar();
        const botao = (id: number) => lista().querySelector<HTMLButtonElement>(`[data-id="${id}"] .confirmar-retirada-btn`)!;
        expect(botao(10).disabled).toBe(false);
        expect(botao(14).disabled).toBe(true);
        expect(botao(15).disabled).toBe(true);
        expect(lista().querySelector('[data-id="14"] .info-data-relativa')!.textContent).toContain('Retirada liberada a partir de');

        // 16 min depois o início de Ivo está a 29 min: a janela abriu; o card não foi recriado.
        const card = lista().querySelector('[data-id="14"]');
        vi.advanceTimersByTime(16 * 60_000);
        expect(lista().querySelector('[data-id="14"]')).toBe(card);
        expect(botao(14).disabled).toBe(false);
        expect(lista().querySelector('[data-id="14"] .info-data-relativa')).toBeNull();
    });

    it('o timer troca o badge de Hoje para Atrasado e de Atrasado para Expirado', () => {
        m.agendados = [agendado(10, 'Eva', 5, 30)];
        aba('agendamentos').click();
        const badge = () => lista().querySelector('[data-id="10"] .status-badge')!;
        expect(badge().textContent).toMatch(/^Hoje/);
        vi.advanceTimersByTime(INTERVALO_ATUALIZACAO_AGENDAMENTOS_MS * 12); // +6 min
        expect(badge().textContent).toBe('Atrasado');
        vi.advanceTimersByTime(30 * 60_000);
        expect(badge().textContent).toBe('Expirado');
        expect(lista().querySelector<HTMLButtonElement>('[data-id="10"] .confirmar-retirada-btn')!.disabled).toBe(true);
    });

    it('o timer só roda com a aba Agendamentos aberta e some ao esvaziar a lista', () => {
        const limpar = vi.spyOn(window, 'clearInterval');
        expect(vi.getTimerCount()).toBe(0);
        aba('andamento').click();
        expect(vi.getTimerCount()).toBe(0);
        aba('agendamentos').click();
        expect(vi.getTimerCount()).toBe(1);
        m.agendados = [];
        notificar();
        expect(vi.getTimerCount()).toBe(0);
        expect(limpar).toHaveBeenCalled();
    });

    it('confirmar retirada: modal informativo, chamada ao store e toast de sucesso', async () => {
        aba('agendamentos').click();
        m.confirmarAcao.mockResolvedValue(true);
        m.confirmarRetirada.mockResolvedValue({});
        lista().querySelector<HTMLElement>('[data-id="10"] .confirmar-retirada-btn')!.click();
        await esperar();
        const opcoes = m.confirmarAcao.mock.calls[0][0];
        expect(opcoes.variante).toBe('info');
        expect(opcoes.rotuloConfirmar).toBe('devolucao.confirmar_retirada');
        expect(opcoes.detalhesHtml).toContain('2x Notebook');
        expect(opcoes.detalhesHtml).toContain('Eva');
        expect(m.confirmarRetirada).toHaveBeenCalledWith(10);
        expect(m.showToast).toHaveBeenCalledWith('Retirada confirmada com sucesso', 'success');
    });

    it('cancelar o modal não confirma a retirada', async () => {
        aba('agendamentos').click();
        m.confirmarAcao.mockResolvedValue(false);
        lista().querySelector<HTMLElement>('[data-id="10"] .confirmar-retirada-btn')!.click();
        await esperar();
        expect(m.confirmarRetirada).not.toHaveBeenCalled();
        expect(m.showToast).not.toHaveBeenCalled();
    });

    it('409 unidades_nao_devolvidas: lista os empréstimos pendentes em vez de um toast genérico', async () => {
        aba('agendamentos').click();
        m.confirmarAcao.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
        m.confirmarRetirada.mockRejectedValue(new ApiError('Há unidades', 409, {
            erro: 'backend.emprestimos.unidades_nao_devolvidas',
            emprestimosPendentes: [{ id: 3, solicitanteNome: 'Luiza', dataPrevistaDevolucao: em(-5).toISOString() }]
        }));
        lista().querySelector<HTMLElement>('[data-id="10"] .confirmar-retirada-btn')!.click();
        await esperar();
        expect(m.confirmarAcao).toHaveBeenCalledTimes(2);
        const aviso = m.confirmarAcao.mock.calls[1][0];
        expect(aviso.variante).toBe('error');
        expect(aviso.mensagem).toBe('Estas unidades ainda não foram devolvidas:');
        expect(aviso.detalhesHtml).toContain('Luiza');
        expect(m.showToast).not.toHaveBeenCalledWith(expect.anything(), 'success');
    });

    it('outro erro ao confirmar vira toast de erro', async () => {
        aba('agendamentos').click();
        m.confirmarAcao.mockResolvedValue(true);
        m.confirmarRetirada.mockRejectedValue(new Error('feedback.erro_confirmar_retirada'));
        lista().querySelector<HTMLElement>('[data-id="10"] .confirmar-retirada-btn')!.click();
        await esperar();
        expect(m.showToast).toHaveBeenCalledWith('Erro ao confirmar a retirada.', 'error');
    });

    it('excluir agendamento: variante de erro, exclusão e toast', async () => {
        aba('agendamentos').click();
        m.confirmarAcao.mockResolvedValue(true);
        m.excluirAgendamento.mockResolvedValue(undefined);
        // Expirado/sem comparecimento também pode ser excluído.
        lista().querySelector<HTMLElement>('[data-id="11"] .excluir-agendamento-btn')!.click();
        await esperar();
        expect(m.confirmarAcao.mock.calls[0][0].variante).toBe('error');
        expect(m.confirmarAcao.mock.calls[0][0].rotuloConfirmar).toBe('devolucao.excluir_agendamento');
        expect(m.excluirAgendamento).toHaveBeenCalledWith(11);
        expect(m.showToast).toHaveBeenCalledWith('Agendamento excluído com sucesso', 'success');
    });

    it('excluir cancelado ou com falha', async () => {
        aba('agendamentos').click();
        m.confirmarAcao.mockResolvedValueOnce(false);
        lista().querySelector<HTMLElement>('[data-id="10"] .excluir-agendamento-btn')!.click();
        await esperar();
        expect(m.excluirAgendamento).not.toHaveBeenCalled();

        m.confirmarAcao.mockResolvedValueOnce(true);
        m.excluirAgendamento.mockRejectedValue(new Error('feedback.erro_excluir_agendamento'));
        lista().querySelector<HTMLElement>('[data-id="10"] .excluir-agendamento-btn')!.click();
        await esperar();
        expect(m.showToast).toHaveBeenCalledWith('Erro ao excluir o agendamento.', 'error');
    });

    it('detalhes do agendamento no painel: título, janela e ações de agendamento', () => {
        aba('agendamentos').click();
        lista().querySelector<HTMLElement>('[data-id="10"] .detalhes-btn')!.click();
        const painel = document.querySelector('.devolucao-detalhe-painel')!;
        expect(painel.classList.contains('is-agendamento')).toBe(true);
        expect(document.getElementById('devolucao-detalhe-titulo')!.textContent).toBe('Detalhes do Agendamento');
        expect(document.getElementById('detalhe-emprestimo-data')!.textContent).toMatch(/^Agendado para /);
        expect(document.querySelector('#detalhe-emprestimo-lista .detalhe-item-status')).toBeNull();
        expect((document.getElementById('btn-detalhe-confirmar-retirada') as HTMLButtonElement).disabled).toBe(false);
        // Trocar de aba fecha o detalhe (o item deixa de estar na lista).
        aba('andamento').click();
        expect(painel.classList.contains('is-agendamento')).toBe(false);
    });

    it('aba vazia usa o estado vazio do componente', () => {
        m.agendados = [];
        notificar();
        aba('agendamentos').click();
        expect(cards()).toHaveLength(0);
        expect(lista().textContent).toContain('Nenhum agendamento');
        expect(aba('agendamentos').textContent).toBe('Agendamentos (0)');
        m.abertos = [];
        aba('andamento').click();
        expect(lista().textContent).not.toContain('Nenhum agendamento');
        expect(lista().querySelector('.devolucao-vazia')).not.toBeNull();
    });

    it('a busca vale para a aba ativa', () => {
        const campo = document.getElementById('devolucao-busca') as HTMLInputElement;
        campo.value = 'carlos';
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        expect(cards().map((c) => c.dataset.id)).toEqual(['1']);
        aba('agendamentos').click();
        expect(cards()).toHaveLength(0);
        campo.value = 'fabio';
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        expect(cards().map((c) => c.dataset.id)).toEqual(['11']);
    });
});
