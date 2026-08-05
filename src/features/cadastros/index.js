import { attachCadastrosEvents } from './events.js';

export function initCadastros() {
    const cards = document.querySelectorAll('.cadastro-card');
    const modal = document.getElementById('modal-cadastro');
    if (!cards.length || !modal) return;

    const els = {
        cards,
        titulo: document.getElementById('cadastro-modal-title'),
        subtitulo: document.getElementById('cadastro-modal-subtitle'),
        headerIcone: document.getElementById('cadastro-modal-icon'),
        headerIconeSymbol: document.getElementById('cadastro-modal-icon-symbol'),
        camposWrap: document.getElementById('cadastro-modal-fields'),
        listaWrap: document.getElementById('cadastro-modal-list'),
        btnCancelar: document.getElementById('cadastro-modal-cancelar'),
        btnSalvar: document.getElementById('cadastro-modal-salvar')
    };

    const estado = { tipoAtual: null };

    attachCadastrosEvents(els, estado);
}