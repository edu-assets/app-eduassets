import { subscribe as subscribeOcorrencias } from '../../core/state/ocorrenciasStore.js';
import { attachControleEvents } from './events.js';
import { renderControle } from './render.js';

export function initControle() {
    const registrosContainer = document.querySelector('.controle-registros-container');
    if (!registrosContainer) return;

    const els = {
        registrosContainer,
        btnNovo: document.getElementById('btn-novo-registro'),
        menuNovo: document.getElementById('novo-registro-menu'),
        btnResolver: document.getElementById('btn-resolver-registro'),
        btnEditar: document.getElementById('btn-editar-registro'),
        btnDeletar: document.getElementById('btn-deletar-registro'),
        paginacaoTexto: document.getElementById('controle-paginacao-texto'),
        modalTitle: document.getElementById('controle-modal-title'),
        campoCategoria: document.getElementById('controle-modal-categoria'),
        campoModelo: document.getElementById('controle-modal-modelo'),
        campoNumero: document.getElementById('controle-modal-numero'),
        campoProblema: document.getElementById('controle-modal-problema'),
        campoDescricao: document.getElementById('controle-modal-descricao'),
        linhaMedidas: document.getElementById('controle-modal-medidas-row'),
        campoMedidas: document.getElementById('controle-modal-medidas'),
        btnModalCancelar: document.getElementById('controle-modal-cancelar'),
        btnModalSalvar: document.getElementById('controle-modal-salvar'),
        resolverCategoriaModelo: document.getElementById('controle-resolver-categoria-modelo'),
        resolverNumeroProblema: document.getElementById('controle-resolver-numero-problema'),
        resolverDescricao: document.getElementById('controle-resolver-descricao'),
        resolverMedidas: document.getElementById('controle-resolver-medidas'),
        btnResolverCancelar: document.getElementById('controle-resolver-cancelar'),
        btnResolverConfirmar: document.getElementById('controle-resolver-confirmar')
    };

    const estado = {
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