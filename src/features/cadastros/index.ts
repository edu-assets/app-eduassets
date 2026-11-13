import { attachCadastrosEvents } from './events.js';
import { aprimorarCampoSenha } from '../../shared/components/passwordField.js';
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
        btnSalvar: document.getElementById('cadastro-modal-salvar') as HTMLButtonElement | null,
        busca: document.getElementById('cadastro-modal-busca') as HTMLInputElement | null,
        rfidModal: {
            overlay: document.getElementById('modal-cadastro-rfid') as HTMLElement,
            avatar: document.getElementById('rfid-modal-avatar') as HTMLElement,
            nome: document.getElementById('rfid-modal-nome') as HTMLElement,
            login: document.getElementById('rfid-modal-login') as HTMLElement,
            estadoVazio: document.getElementById('rfid-estado-vazio') as HTMLElement,
            estadoToken: document.getElementById('rfid-estado-token') as HTMLElement,
            estadoGravacao: document.getElementById('rfid-estado-gravacao') as HTMLElement,
            estadoVinculado: document.getElementById('rfid-estado-vinculado') as HTMLElement,
            tokenValor: document.getElementById('rfid-token-valor') as HTMLElement,
            btnGerar: document.getElementById('btn-rfid-gerar') as HTMLButtonElement,
            btnRegerar: document.getElementById('btn-rfid-regerar') as HTMLButtonElement,
            btnRevogar: document.getElementById('btn-rfid-revogar') as HTMLButtonElement,
            btnCopiar: document.getElementById('btn-rfid-copiar') as HTMLButtonElement,
            btnFechar: document.getElementById('rfid-modal-fechar') as HTMLElement
        },
        resetSenhaModal: {
            form: document.getElementById('reset-senha-form') as HTMLFormElement,
            avatar: document.getElementById('reset-senha-avatar') as HTMLElement,
            nome: document.getElementById('reset-senha-nome') as HTMLElement,
            login: document.getElementById('reset-senha-login') as HTMLElement,
            novaSenha: document.getElementById('reset-senha-nova') as HTMLInputElement,
            confirmarSenha: document.getElementById('reset-senha-confirmar') as HTMLInputElement,
            btnSalvar: document.getElementById('reset-senha-salvar') as HTMLButtonElement,
            btnCancelar: document.getElementById('reset-senha-cancelar') as HTMLElement
        }
    };

    aprimorarCampoSenha(els.resetSenhaModal.novaSenha, { checklist: true });
    aprimorarCampoSenha(els.resetSenhaModal.confirmarSenha);

    const estado: CadastrosEstado = { tipoAtual: null };

    attachCadastrosEvents(els, estado);
}