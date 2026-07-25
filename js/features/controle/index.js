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
        btnModalSalvar: document.getElementById('controle-modal-salvar')
    };

    const estado = {
        linhaSelecionada: null,
        tipoAtual: null,
        idEditando: null,
        linhaEditando: null
    };

    attachControleEvents(els, estado);

    renderControle(els, estado);
    subscribeOcorrencias(() => renderControle(els, estado));
}