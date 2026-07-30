import { showToast } from '../../core/ui/index.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';
import { trocarSenha } from './service.js';

export function initConfig() {
    const btnSalvar = document.getElementById('config-salvar');
    if (!btnSalvar) return;

    const temaGroup = document.getElementById('config-tema-group');
    if (temaGroup) {
        temaGroup.querySelectorAll('.config-toggle-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                temaGroup.querySelectorAll('.config-toggle-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    document.querySelectorAll('.config-switch').forEach((switchEl) => {
        switchEl.addEventListener('click', () => {
            const ativo = switchEl.classList.toggle('active');
            switchEl.setAttribute('aria-checked', String(ativo));
            switchEl.querySelector('.config-switch-label').textContent = ativo ? 'Ativado' : 'Desativado';
        });
    });

    btnSalvar.addEventListener('click', () => {
        if (bloquearSeConvidado()) return;
        showToast('Configurações salvas com sucesso', 'success');
    });

    initTrocaSenha();
}

function initTrocaSenha() {
    const btnSenhaSalvar = document.getElementById('config-senha-salvar');
    if (!btnSenhaSalvar) return;

    const inputAtual = document.getElementById('config-senha-atual');
    const inputNova = document.getElementById('config-senha-nova');
    const inputConfirmar = document.getElementById('config-senha-confirmar');
    const erroEl = document.getElementById('config-senha-erro');

    btnSenhaSalvar.addEventListener('click', async () => {
        if (bloquearSeConvidado()) return;

        mostrarErroSenha(erroEl, '');
        btnSenhaSalvar.disabled = true;

        try {
            await trocarSenha(inputAtual.value, inputNova.value, inputConfirmar.value);
            showToast('Senha alterada com sucesso', 'success');
            inputAtual.value = '';
            inputNova.value = '';
            inputConfirmar.value = '';
        } catch (erro) {
            mostrarErroSenha(erroEl, erro instanceof Error ? erro.message : 'Erro ao alterar senha.');
        } finally {
            btnSenhaSalvar.disabled = false;
        }
    });
}

function mostrarErroSenha(erroEl, mensagem) {
    if (!erroEl) return;
    erroEl.textContent = mensagem;
    erroEl.style.display = mensagem ? 'block' : 'none';
}