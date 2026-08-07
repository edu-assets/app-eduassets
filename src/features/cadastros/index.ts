import { attachCadastrosEvents } from './events.js';
import type { CadastrosEls, CadastrosEstado } from './events.js';

export function initCadastros(): void {
    const cards = document.querySelectorAll<HTMLElement>('.cadastro-card');
    const modal = document.getElementById('modal-cadastro');
    if (!cards.length || !modal) return;

    const els: CadastrosEls = {
        cards,
        titulo: document.getElementById('cadastro-modal-title') as HTMLElement,
        subtitulo: document.getElementById('cadastro-modal-subtitle'),
        headerIcone: document.getElementById('cadastro-modal-icon'),
        headerIconeSymbol: document.getElementById('cadastro-modal-icon-symbol'),
        camposWrap: document.getElementById('cadastro-modal-fields') as HTMLElement,
        listaWrap: document.getElementById('cadastro-modal-list') as HTMLElement,
        btnCancelar: document.getElementById('cadastro-modal-cancelar'),
        btnSalvar: document.getElementById('cadastro-modal-salvar') as HTMLButtonElement | null
    };

    const estado: CadastrosEstado = { tipoAtual: null };

    attachCadastrosEvents(els, estado);
}