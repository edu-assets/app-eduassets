import { subscribe as subscribeOcorrencias } from '../../core/state/ocorrenciasStore.js';
import { attachControleEvents } from './events.js';
import { renderControle } from './render.js';
import type { ControleEls, ControleEstado } from './render.js';

export function initControle(): void {
    const registrosContainer = document.querySelector<HTMLElement>('.controle-registros-container');
    if (!registrosContainer) return;

    const els: ControleEls = {
        registrosContainer,
        btnNovo: document.getElementById('btn-novo-registro'),
        menuNovo: document.getElementById('novo-registro-menu'),
        btnResolver: document.getElementById('btn-resolver-registro') as HTMLButtonElement | null,
        btnEditar: document.getElementById('btn-editar-registro') as HTMLButtonElement | null,
        btnDeletar: document.getElementById('btn-deletar-registro') as HTMLButtonElement | null,
        paginacaoTexto: document.getElementById('controle-paginacao-texto'),
        modalTitle: document.getElementById('controle-modal-title'),
        modalSubtitle: document.getElementById('controle-modal-subtitle'),
        modalHeaderIcon: document.getElementById('controle-modal-icon'),
        modalHeaderIconSymbol: document.getElementById('controle-modal-icon-symbol'),
        campoCategoria: document.getElementById('controle-modal-categoria') as HTMLSelectElement,
        campoModelo: document.getElementById('controle-modal-modelo') as HTMLSelectElement,
        campoNumero: document.getElementById('controle-modal-numero') as HTMLInputElement,
        campoProblema: document.getElementById('controle-modal-problema') as HTMLSelectElement,
        campoDescricao: document.getElementById('controle-modal-descricao') as HTMLTextAreaElement,
        linhaMedidas: document.getElementById('controle-modal-medidas-row'),
        campoMedidas: document.getElementById('controle-modal-medidas') as HTMLTextAreaElement | null,
        btnModalCancelar: document.getElementById('controle-modal-cancelar'),
        btnModalSalvar: document.getElementById('controle-modal-salvar'),
        resolverCategoriaModelo: document.getElementById('controle-resolver-categoria-modelo'),
        resolverNumeroProblema: document.getElementById('controle-resolver-numero-problema'),
        resolverDescricao: document.getElementById('controle-resolver-descricao'),
        resolverMedidas: document.getElementById('controle-resolver-medidas') as HTMLTextAreaElement | null,
        btnResolverCancelar: document.getElementById('controle-resolver-cancelar'),
        btnResolverConfirmar: document.getElementById('controle-resolver-confirmar')
    };

    const estado: ControleEstado = {
        linhaSelecionada: null,
        tipoAtual: null,
        idEditando: null,
        linhaEditando: null,
        idResolvendo: null
    };

    attachControleEvents(els, estado);

    renderControle(els, estado);
    subscribeOcorrencias(() => renderControle(els, estado));
}