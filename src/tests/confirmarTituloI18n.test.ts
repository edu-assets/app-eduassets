// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => localStorage.setItem('eduassets_lang', 'pt'));
import { initI18n } from '../core/state/i18nStore.js';
import { initModals } from '../core/ui/modal.js';
import { initConfirm, confirmarAcao } from '../core/ui/confirm.js';
import indexHtml from '../../index.html?raw';

// Marcação real do modal: o tradutor automático não pode reescrever o título definido por confirmarAcao.
const modal = indexHtml.match(/<div class="modal-overlay" id="modal-confirmar-exclusao">[\s\S]*?\n {4}<\/div>\n/)![0];

describe('modal de confirmação + tradução automática', () => {
    it('mantém o título e a mensagem passados, sem voltar a "Excluir registro"', async () => {
        document.body.innerHTML = modal;
        initI18n();
        initModals();
        initConfirm();

        void confirmarAcao({
            titulo: 'agendamento.confirmar_titulo',
            mensagem: 'Mensagem qualquer',
            rotuloConfirmar: 'emprestimo.agendar',
            variante: 'info',
            icone: 'event_available'
        });
        await new Promise((r) => setTimeout(r, 0)); // deixa o MutationObserver rodar

        expect(document.getElementById('confirmar-exclusao-titulo')!.textContent).toBe('Gostaria de agendar o uso desses equipamentos?');
        expect(document.getElementById('confirmar-exclusao-mensagem')!.textContent).toBe('Mensagem qualquer');
    });
});
