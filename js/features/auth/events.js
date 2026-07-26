import { closeModal, openModal, showToast } from '../../core/ui/index.js';
import { entrar, sair, isAutenticado, subscribe } from '../../core/state/authStore.js';
import { renderAuthStatus, mostrarErroLogin } from './render.js';

export function attachAuthEvents(els) {
    els.toggleBtn.addEventListener('click', () => {
        if (isAutenticado()) {
            sair();
            showToast('Sessão encerrada. Você voltou ao Modo Convidado.', 'success');
        } else {
            mostrarErroLogin(els, '');
            openModal('modal-login');
        }
    });

    els.btnHeroLogin?.addEventListener('click', () => {
        mostrarErroLogin(els, '');
        openModal('modal-login');
    });

    els.btnContinuarConvidado.addEventListener('click', () => closeModal('modal-login'));
    els.btnEntrar.addEventListener('click', () => fazerLogin(els));
    els.senhaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') fazerLogin(els);
    });

    subscribe(({ autenticado, usuario }) => renderAuthStatus(els, autenticado, usuario));
}

async function fazerLogin(els) {
    const login = els.emailInput.value.trim();
    const senha = els.senhaInput.value;

    if (!login || !senha) {
        mostrarErroLogin(els, 'Informe login e senha.');
        return;
    }

    els.btnEntrar.disabled = true;
    try {
        await entrar(login, senha);
        closeModal('modal-login');
        els.emailInput.value = '';
        els.senhaInput.value = '';
        showToast('Login realizado com sucesso.', 'success');
    } catch (erro) {
        mostrarErroLogin(els, erro instanceof Error ? erro.message : 'Erro ao entrar.');
    } finally {
        els.btnEntrar.disabled = false;
    }
}