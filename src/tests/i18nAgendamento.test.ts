import { describe, expect, it } from 'vitest';
import pt from '../core/i18n/pt.json';
import en from '../core/i18n/en.json';

const CHAVES = [
    'emprestimo.agendar', 'emprestimo.devolucao_prevista', 'emprestimo.devolucao_prevista_antes_retirada',
    'emprestimo.aviso_disponivel_agora_singular', 'emprestimo.aviso_disponivel_agora_plural', 'emprestimo.aviso_nenhuma_disponivel_agora',
    'feedback.agendamento_registrado', 'agendamento.confirmar_titulo', 'agendamento.indisponivel_titulo', 'agendamento.sim', 'agendamento.nao',
    'devolucao.aba_em_andamento', 'devolucao.aba_agendamentos', 'devolucao.aba_em_andamento_n', 'devolucao.aba_agendamentos_n',
    'devolucao.badge_hoje', 'devolucao.badge_atrasado', 'devolucao.badge_expirado', 'devolucao.badge_agendado',
    'devolucao.confirmar_retirada', 'devolucao.excluir_agendamento', 'devolucao.confirmar_retirada_titulo', 'devolucao.excluir_agendamento_titulo',
    'devolucao.detalhe_agendado_retirado', 'feedback.retirada_confirmada', 'feedback.agendamento_excluido',
    'dashboard.filtro_agendados', 'exportar.coluna_agendado_para', 'exportar.coluna_devolucao_prevista',
    'inicio.resumo_agendamento_hoje', 'inicio.resumo_agendamentos_hoje',
    'controle.agendamentos_afetados_um', 'controle.agendamentos_afetados_varios', 'shared.statusBadge.agendado',
    'backend.emprestimos.devolucao_prevista_obrigatoria', 'backend.emprestimos.data_retirada_alem_horizonte',
    'backend.emprestimos.devolucao_prevista_invalida', 'backend.emprestimos.nao_agendado',
    'backend.emprestimos.confirmacao_fora_da_janela', 'backend.emprestimos.unidades_nao_devolvidas',
    'backend.emprestimos.nao_excluivel', 'backend.emprestimos.agendamento_nao_confirmado',
    'backend.equipamentos.quantidade_reservada'
];

describe('i18n do agendamento', () => {
    it.each(CHAVES)('%s existe em pt e en', (chave) => {
        expect((pt as Record<string, string>)[chave]).toBeTruthy();
        expect((en as Record<string, string>)[chave]).toBeTruthy();
    });

    it('todas as chaves novas (agendamento.*) existem nos dois idiomas e com os mesmos marcadores', () => {
        const marcadores = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
        Object.keys(pt).filter((k) => k.startsWith('agendamento.')).forEach((k) => {
            const en_ = (en as Record<string, string>)[k];
            expect(en_, k).toBeTruthy();
            expect(marcadores(en_), k).toBe(marcadores((pt as Record<string, string>)[k]));
        });
    });
});
