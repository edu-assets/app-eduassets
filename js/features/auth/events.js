import { closeModal, openModal, showToast } from '../../core/ui/index.js';
import { entrar, sair, isAutenticado, subscribe } from '../../core/state/authStore.js';
import { renderAuthStatus, mostrarErroLogin } from './render.js';

export function attachAuthEvents(els) {
    els.sidebarFooter.addEventListener('click', (e) => {
        const trigger = e.target.closest('#user-menu-trigger');
        if (trigger) {
            e.stopPropagation();
            const dropdown = document.getElementById('user-menu-dropdown');
            const aberto = dropdown?.classList.toggle('active');
            trigger.setAttribute('aria-expanded', String(!!aberto));
            return;
        }

        if (e.target.closest('#btn-user-menu-sair')) {
            fecharDropdown();
            sair();
            showToast('Sessão encerrada. Você voltou ao Modo Convidado.', 'success');
            return;
        }

        if (e.target.closest('#btn-auth-toggle')) {
            mostrarErroLogin(els, '');
            openModal('modal-login');
            return;
        }

        if (e.target.closest('.user-menu-item.nav-link')) {
            fecharDropdown();
        }
    });

    document.addEventListener('click', (e) => {
        if (!els.sidebarFooter.contains(e.target)) fecharDropdown();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharDropdown();
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

function fecharDropdown() {
    document.getElementById('user-menu-dropdown')?.classList.remove('active');
    document.getElementById('user-menu-trigger')?.setAttribute('aria-expanded', 'false');
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