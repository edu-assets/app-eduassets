// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

const abrirDetalhe = vi.fn();
const loan = { id: 7, responsavel: 'Ana', aluno: 'Beto', itens: [], createdAt: new Date(), observacao: '' };

vi.mock('../core/state/i18nStore.js', () => ({ getIdioma: () => 'pt', t: (k: string) => k, traduzirErro: () => '' }));
vi.mock('../core/state/loanStore.js', () => ({ getLoansAbertos: () => [loan] }));
vi.mock('../core/state/liveSync.js', () => ({ atualizarAgora: vi.fn() }));
vi.mock('../core/ui/index.js', () => ({ showToast: vi.fn(), closeModal: vi.fn() }));
vi.mock('../core/auth/guestGate.js', () => ({ bloquearSeConvidado: () => false }));
vi.mock('../features/devolucao/service.js', () => ({}));
vi.mock('../features/devolucao/render.js', () => ({
    abrirDetalhe: (...a: unknown[]) => abrirDetalhe(...a),
    renderDetalheItens: vi.fn(), fecharDetalhe: vi.fn(), setModoEdicao: vi.fn(),
    abrirModalConfirmacao: vi.fn(), fecharPainelMobile: vi.fn()
}));

import { renderDevolucaoCard } from '../features/devolucao/templates.js';
import { attachDevolucaoEvents } from '../features/devolucao/events.js';

describe('botão Detalhes do card', () => {
    it('abre a mesma visão de detalhes do clique no card', () => {
        const lista = document.createElement('div');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lista.innerHTML = renderDevolucaoCard(loan as any);
        document.body.appendChild(lista);
        const el = () => document.createElement('div');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const els: any = {
            lista, btnConfirmarDevolucao: el(), btnConfirmarDevolucaoPainel: el(), btnDetalheFechar: el(),
            btnDetalheCancelar: el(), btnDetalheEditar: el(), btnDetalheAdicionarItem: el(), detalheLista: el(),
            btnDetalheSalvar: el(), backdrop: null, painel: null, btnCancelarDevolucao: null
        };
        attachDevolucaoEvents(els, { idPendente: null, idDetalheAberto: null, itensEditando: [], itensOriginais: [], modoEdicaoAtivo: false });

        lista.querySelector<HTMLButtonElement>('.detalhes-btn')!.click();
        expect(abrirDetalhe).toHaveBeenCalledTimes(1);
        expect(abrirDetalhe.mock.calls[0][2]).toBe(loan);
    });
});
