// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ confirmarAcao: vi.fn() }));
vi.mock('../core/ui/index.js', () => ({ confirmarAcao: m.confirmarAcao }));

import { definirIdioma } from '../core/state/i18nStore.js';
import { avisarAgendamentosAfetados } from '../features/controle/agendamentosAfetados.js';
import type { AgendamentoAfetado } from '../types/index.js';

const afetado = (id: number, nome: string): AgendamentoAfetado => ({
    id, solicitanteNome: nome,
    dataAgendada: new Date(2026, 10, 25, 9, 0).toISOString(),
    dataPrevistaDevolucao: new Date(2026, 10, 25, 10, 30).toISOString()
});

describe('aviso de agendamentos afetados por uma ocorrência', () => {
    beforeEach(() => { definirIdioma('pt'); m.confirmarAcao.mockReset(); m.confirmarAcao.mockResolvedValue(true); });

    it('sem agendamentos afetados não mostra nada', async () => {
        await avisarAgendamentosAfetados([]);
        expect(m.confirmarAcao).not.toHaveBeenCalled();
    });

    it('um agendamento: título no singular e linha com solicitante e janela', async () => {
        await avisarAgendamentosAfetados([afetado(1, 'Beto')]);
        const o = m.confirmarAcao.mock.calls[0][0];
        expect(o.variante).toBe('warning');
        expect(o.mensagem).toBe('Esta ocorrência afeta 1 agendamento');
        expect(o.detalhesHtml).toContain('Beto');
        expect(o.detalhesHtml).toContain('10:30');
    });

    it('vários: plural e uma linha por agendamento (nomes escapados)', async () => {
        await avisarAgendamentosAfetados([afetado(1, 'Beto'), afetado(2, '<b>Ana</b>')]);
        const o = m.confirmarAcao.mock.calls[0][0];
        expect(o.mensagem).toBe('Esta ocorrência afeta 2 agendamentos');
        expect(o.detalhesHtml.match(/modal-summary-row/g)).toHaveLength(2);
        expect(o.detalhesHtml).not.toContain('<b>Ana</b>');
    });
});
