import { getEquipamentos, subscribe as subscribeEquipamentos } from '../../core/state/equipamentoStore.js';
import { getResponsaveis, subscribe as subscribeResponsaveis } from '../../core/state/responsavelStore.js';
import { criarDataAutoPicker } from '../../core/ui/index.js';
import { attachEmprestimoEvents, atualizarLimiteQuantidade, atualizarRotuloSubmit } from './events.js';
import { agora } from '../../core/time/serverClock.js';
import { inicioMaximoAgendamento } from '../../core/utils/estoque.js';
import { iniciarSugestoesSolicitante } from './solicitantes.js';
import { renderItens, popularSelectEquipamentos, popularSelectResponsaveis } from './render.js';
import { subscribe as subscribeI18n } from '../../core/state/i18nStore.js';
import type { LoanItemUI } from '../../types/index.js';

export async function initEmprestimo(): Promise<void> {
    const form = document.querySelector<HTMLFormElement>('#panel-emprestimo form');
    if (!form) return;

     const dataInput = document.getElementById('data-emprestimo') as HTMLInputElement | null;
    const equipamentoSelect = document.getElementById('equipamento') as HTMLSelectElement | null;
    const responsavelSelect = document.getElementById('responsavel') as HTMLSelectElement | null;
    const btnSubmit = form.querySelector<HTMLButtonElement>('.registrar-emprestimo');

    if (!dataInput || !equipamentoSelect || !responsavelSelect || !btnSubmit) {
        console.error('[eduAssets] initEmprestimo: elementos essenciais do formulário não encontrados.');
        return;
    }

    // O picker dispara este gancho; `attachEmprestimoEvents` o liga depois de montar `els`.
    const ganchos: { retiradaMudou?: () => void } = {};
    const picker = await criarDataAutoPicker(dataInput, {
        maxDate: () => inicioMaximoAgendamento(agora()),
        aoMudar: () => ganchos.retiradaMudou?.()
    });

    const els = {
        form,
        ganchos,
        dataInput,
        equipamentoSelect: document.getElementById('equipamento') as HTMLSelectElement,
        quantidadeInput: document.getElementById('quantidade') as HTMLInputElement,
        btnAdicionar: document.getElementById('btn-adicionar-item') as HTMLButtonElement,
        itensList: document.getElementById('itens-emprestimo-list') as HTMLElement,
        itensCount: document.getElementById('itens-emprestimo-count'),
        modalItensLista: document.getElementById('modal-itens-emprestimo-lista') as HTMLElement,
        responsavelSelect: document.getElementById('responsavel') as HTMLSelectElement,
        solicitanteInput: document.getElementById('solicitante') as HTMLInputElement,
        observacaoInput: document.getElementById('observacao') as HTMLTextAreaElement,
        btnSubmit: form.querySelector('.registrar-emprestimo') as HTMLButtonElement,
        picker
    };

    const estado: { itens: LoanItemUI[] } = { itens: [] };

    popularSelectEquipamentos(els.equipamentoSelect, getEquipamentos(), estado.itens);
    popularSelectResponsaveis(els.responsavelSelect, getResponsaveis());
    subscribeEquipamentos((equipamentos) => {
        popularSelectEquipamentos(els.equipamentoSelect, equipamentos, estado.itens);
        atualizarLimiteQuantidade(els, estado);
    });
    subscribeResponsaveis((responsaveis) => popularSelectResponsaveis(els.responsavelSelect, responsaveis));

    attachEmprestimoEvents(els, estado);
    atualizarRotuloSubmit(els);
    iniciarSugestoesSolicitante();

    renderItens(els, estado.itens);

    // Placeholders dos selects e estado vazio da lista são gerados por JS: refazê-los ao trocar de idioma.
    subscribeI18n(() => {
        popularSelectEquipamentos(els.equipamentoSelect, getEquipamentos(), estado.itens);
        popularSelectResponsaveis(els.responsavelSelect, getResponsaveis());
        renderItens(els, estado.itens);
        atualizarRotuloSubmit(els);
    });

    // O limite "mais de 5 min à frente" anda com o relógio: reavalia o rótulo sem exigir nova edição.
    window.setInterval(() => atualizarRotuloSubmit(els), 30_000);
}