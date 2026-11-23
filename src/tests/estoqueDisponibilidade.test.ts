import { describe, expect, it } from 'vitest';
import {
    capacidadeEquipamento, ehAgendamento, inicioMinimoAgendamento, intervalosOcupados, livreNoIntervalo,
    proximoHorarioLivre, type ContextoDisponibilidade, type LoanOcupacaoMinimo
} from '../core/utils/estoque.js';

const AGORA = new Date('2026-11-23T12:00:00.000Z');
const H = 3_600_000;
const em = (horas: number): Date => new Date(AGORA.getTime() + horas * H);
const iso = (horas: number): string => em(horas).toISOString();

const notebook = { id: 1, quantidadeTotal: 5, quantidadeQuebrada: 1 };

function aberto(id: number, quantidade: number, retiradaH: number, previstaH: number | null): LoanOcupacaoMinimo {
    return {
        id, status: 'aberto', data: iso(retiradaH), dataAgendada: null,
        dataPrevistaDevolucao: previstaH === null ? null : iso(previstaH), itens: [{ id: 1, quantidade }]
    };
}

function agendado(id: number, quantidade: number, inicioH: number, fimH: number): LoanOcupacaoMinimo {
    return { id, status: 'agendado', data: iso(inicioH), dataAgendada: iso(inicioH), dataPrevistaDevolucao: iso(fimH), itens: [{ id: 1, quantidade }] };
}

function contexto(loans: LoanOcupacaoMinimo[], manutencao: Array<{ equipamentoId: number; status?: string }> = []): ContextoDisponibilidade {
    return { loans, ocorrenciasManutencao: manutencao, agora: AGORA };
}

describe('capacidadeEquipamento', () => {
    it('total - quebradas - manutenções abertas', () => {
        expect(capacidadeEquipamento(notebook, [])).toBe(4);
        expect(capacidadeEquipamento(notebook, [{ equipamentoId: 1, status: 'aberto' }, { equipamentoId: 2, status: 'aberto' }])).toBe(3);
    });
    it('ignora manutenções resolvidas e nunca fica negativa', () => {
        expect(capacidadeEquipamento(notebook, [{ equipamentoId: 1, status: 'resolvidos' }])).toBe(4);
        const muitas = Array.from({ length: 9 }, () => ({ equipamentoId: 1, status: 'aberto' }));
        expect(capacidadeEquipamento(notebook, muitas)).toBe(0);
        expect(capacidadeEquipamento(undefined)).toBe(0);
    });
});

describe('intervalosOcupados', () => {
    it('ABERTO com previsão futura ocupa até a previsão; vencido ou sem previsão ocupa para sempre', () => {
        const loans = [aberto(1, 1, -2, 3), aberto(2, 1, -5, -1), aberto(3, 1, -5, null)];
        const r = intervalosOcupados(1, loans, AGORA);
        expect(r.map((i) => i.fim)).toEqual([em(3).getTime(), Infinity, Infinity]);
    });
    it('AGENDADO ocupa [início agendado, previsão); devolvido e o excluído não contam', () => {
        const devolvido: LoanOcupacaoMinimo = { ...aberto(9, 2, -5, -1), status: 'devolvido' };
        const r = intervalosOcupados(1, [agendado(1, 2, 4, 6), devolvido, agendado(2, 1, 8, 9)], AGORA, 2);
        expect(r).toEqual([{ loanId: 1, inicio: em(4).getTime(), fim: em(6).getTime(), quantidade: 2 }]);
    });
});

describe('livreNoIntervalo', () => {
    it('sem ocupação: toda a capacidade', () => {
        expect(livreNoIntervalo(notebook, em(1), em(2), contexto([]))).toBe(4);
    });

    it('agendamentos que se sobrepõem somam; os que não se sobrepõem compartilham as unidades', () => {
        const loans = [agendado(1, 3, 2, 4), agendado(2, 3, 4, 6)];
        // Encostam em 4h (intervalo semiaberto): nunca ocupam as 6 unidades juntos.
        expect(livreNoIntervalo(notebook, em(2), em(6), contexto(loans))).toBe(1);
        const sobrepostos = [agendado(1, 3, 2, 5), agendado(2, 1, 4, 6)];
        expect(livreNoIntervalo(notebook, em(2), em(6), contexto(sobrepostos))).toBe(0);
    });

    it('janela que só encosta na ocupação não é afetada (início = fim do outro, fim = início do outro)', () => {
        const loans = [agendado(1, 4, 4, 6)];
        expect(livreNoIntervalo(notebook, em(6), em(8), contexto(loans))).toBe(4);
        expect(livreNoIntervalo(notebook, em(2), em(4), contexto(loans))).toBe(4);
        expect(livreNoIntervalo(notebook, em(2), em(5), contexto(loans))).toBe(0);
    });

    it('empréstimo vencido ou sem previsão bloqueia qualquer janela futura', () => {
        expect(livreNoIntervalo(notebook, em(10), em(11), contexto([aberto(1, 3, -5, -1)]))).toBe(1);
        expect(livreNoIntervalo(notebook, em(10), em(11), contexto([aberto(1, 3, -5, null)]))).toBe(1);
    });

    it('ABERTO com previsão futura libera as unidades depois dela', () => {
        const loans = [aberto(1, 3, -1, 3)];
        expect(livreNoIntervalo(notebook, em(0), em(2), contexto(loans))).toBe(1);
        expect(livreNoIntervalo(notebook, em(3), em(5), contexto(loans))).toBe(4);
    });

    it('excluirLoanId ignora o próprio agendamento; manutenção reduz a capacidade; nunca negativo', () => {
        const loans = [agendado(7, 4, 2, 4)];
        expect(livreNoIntervalo(notebook, em(2), em(4), contexto(loans), 7)).toBe(4);
        expect(livreNoIntervalo(notebook, em(2), em(4), contexto([], [{ equipamentoId: 1, status: 'aberto' }]))).toBe(3);
        expect(livreNoIntervalo(notebook, em(2), em(4), contexto([aberto(1, 5, -1, null)]))).toBe(0);
    });
});

describe('proximoHorarioLivre', () => {
    it('devolve agora quando há unidades livres', () => {
        expect(proximoHorarioLivre([{ equipamento: notebook, quantidade: 2 }], H, contexto([]))?.getTime()).toBe(AGORA.getTime());
    });

    it('espera o fim da ocupação que bloqueia', () => {
        const loans = [aberto(1, 3, -1, 5)];
        const r = proximoHorarioLivre([{ equipamento: notebook, quantidade: 3 }], H, contexto(loans));
        expect(r?.getTime()).toBe(em(5).getTime());
    });

    it('considera que um agendamento futuro pode atrapalhar a janela inteira', () => {
        // Livre agora, mas um agendamento às 2h consome tudo até 4h: a janela de 3h só cabe a partir de 4h.
        const loans = [agendado(1, 4, 2, 4)];
        const r = proximoHorarioLivre([{ equipamento: notebook, quantidade: 2 }], 3 * H, contexto(loans));
        expect(r?.getTime()).toBe(em(4).getTime());
    });

    it('respeita "desde" (início mínimo de um agendamento)', () => {
        const desde = inicioMinimoAgendamento(AGORA);
        const r = proximoHorarioLivre([{ equipamento: notebook, quantidade: 1 }], H, contexto([]), { desde });
        expect(r?.getTime()).toBe(desde.getTime());
        expect(ehAgendamento(desde, AGORA)).toBe(true);
    });

    it('vários itens: todos precisam caber', () => {
        const projetor = { id: 2, quantidadeTotal: 1, quantidadeQuebrada: 0 };
        const loans: LoanOcupacaoMinimo[] = [{ ...aberto(1, 1, -1, 6), itens: [{ id: 2, quantidade: 1 }] }];
        const r = proximoHorarioLivre([{ equipamento: notebook, quantidade: 1 }, { equipamento: projetor, quantidade: 1 }], H, contexto(loans));
        expect(r?.getTime()).toBe(em(6).getTime());
    });

    it('null quando acima da capacidade, ocupado para sempre ou além de 15 dias', () => {
        expect(proximoHorarioLivre([{ equipamento: notebook, quantidade: 5 }], H, contexto([]))).toBeNull();
        expect(proximoHorarioLivre([{ equipamento: notebook, quantidade: 2 }], H, contexto([aberto(1, 3, -5, null)]))).toBeNull();
        const longe = [aberto(1, 4, -1, 16 * 24)];
        expect(proximoHorarioLivre([{ equipamento: notebook, quantidade: 1 }], H, contexto(longe))).toBeNull();
    });
});

describe('ehAgendamento / inicioMinimoAgendamento', () => {
    it('só passa de 5 minutos de antecedência', () => {
        expect(ehAgendamento(new Date(AGORA.getTime() + 5 * 60_000), AGORA)).toBe(false);
        expect(ehAgendamento(new Date(AGORA.getTime() + 5 * 60_000 + 1), AGORA)).toBe(true);
        expect(ehAgendamento(AGORA, AGORA)).toBe(false);
    });
});
