// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { definirIdioma } from '../core/state/i18nStore.js';
import { renderFiltrosHistorico } from '../features/dashboard/filtros.js';
import { renderDashboardHistoricoContent, renderDashboardHistoricoDetalheBody, textoRetiradaDetalhe } from '../features/dashboard/templates.js';
import type { LoanUI } from '../types/index.js';

const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const loan = (parcial: Partial<LoanUI>): LoanUI => ({
    id: 5, numero: 5, aluno: 'Beto', responsavel: 'Ana', responsavelId: 1, status: 'aberto',
    data: new Date(2026, 10, 25, 10, 50).toISOString(), dataAgendada: null, dataPrevistaDevolucao: null, dataDevolucao: null,
    observacao: '', createdAt: new Date(2026, 10, 25, 10, 50), itens: [{ id: 1, nome: 'Notebook', quantidade: 2 }], ...parcial
} as LoanUI);

describe('histórico com agendamentos', () => {
    beforeEach(() => definirIdioma('pt'));

    it('chip "Agendados" aplica status=AGENDADO e fica pressionado', () => {
        const marcado = document.createElement('div');
        marcado.innerHTML = renderFiltrosHistorico({ status: 'AGENDADO' });
        const chip = marcado.querySelector<HTMLElement>('[data-filtro-grupo="status"][data-filtro-valor="AGENDADO"]')!;
        expect(chip.textContent).toBe('Agendados');
        expect(chip.getAttribute('aria-pressed')).toBe('true');
        expect(marcado.querySelector('[data-filtro-valor="TODOS"]')!.getAttribute('aria-pressed')).toBe('false');
    });

    it('a linha do histórico mostra o status Agendado', () => {
        const linha = document.createElement('div');
        linha.innerHTML = renderDashboardHistoricoContent([loan({ status: 'agendado', dataAgendada: new Date(2026, 10, 26, 9, 0).toISOString() })]);
        expect(linha.querySelector('.status-badge--agendado')!.textContent).toBe('Agendado');
    });

    it('detalhe de agendamento já retirado: "Agendado para {data} · Retirado às {hora}"', () => {
        const agendada = new Date(2026, 10, 25, 10, 30);
        const retirada = new Date(2026, 10, 25, 10, 50);
        const texto = textoRetiradaDetalhe(loan({ dataAgendada: agendada.toISOString(), data: retirada.toISOString() }));
        expect(texto).toContain('Agendado para');
        expect(texto).toContain(`Retirado às ${hora(retirada)}`);
        expect(texto).toContain(agendada.toLocaleString('pt-BR'));
    });

    it('empréstimo comum e agendamento pendente mantêm "Retirada em"', () => {
        expect(textoRetiradaDetalhe(loan({}))).toMatch(/^Retirada em /);
        expect(textoRetiradaDetalhe(loan({ status: 'agendado', dataAgendada: new Date().toISOString() }))).toMatch(/^Retirada em /);
    });

    it('detalhe mostra a devolução prevista quando existe', () => {
        const prevista = new Date(2026, 10, 25, 12, 0);
        const comPrevista = renderDashboardHistoricoDetalheBody(loan({ dataPrevistaDevolucao: prevista.toISOString() }));
        expect(comPrevista).toContain(`Devolução prevista: ${prevista.toLocaleString('pt-BR')}`);
        expect(renderDashboardHistoricoDetalheBody(loan({}))).not.toContain('Devolução prevista');
    });
});
