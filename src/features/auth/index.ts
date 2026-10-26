import { iniciarSessao, isAutenticado, getUsuario, isAcessoConvidadoAutorizado } from '../../core/state/authStore.js';
import { getToken } from '../../core/state/tokenStore.js';
import { LOGIN_ROUTE_HASH, resolveEntryDestination, setEntryRoute } from '../../core/layout/entryRoute.js';
import { openModal } from '../../core/ui/index.js';
import { attachAuthEvents } from './events.js';
import { renderAuthStatus } from './render.js';
import type { AuthEls } from './render.js';

export async function initAuth(): Promise<void> {
    const sidebarFooter = document.getElementById('sidebar-footer');
    if (!sidebarFooter) return;

    let liberarEntrada!: () => void;
    const escolhaInicial = new Promise<void>((resolve) => {
        liberarEntrada = resolve;
    });
    const hadTokenAtStartup = getToken() !== null;

    const els: AuthEls = {
        sidebarFooter,
        btnHeroLogin: document.getElementById('btn-abrir-login-hero'),
        form: document.getElementById('login-form') as HTMLFormElement,
        emailInput: document.getElementById('login-email') as HTMLInputElement,
        senhaInput: document.getElementById('login-senha') as HTMLInputElement,
        erro: document.getElementById('login-erro') as HTMLElement,
        btnEntrar: document.getElementById('login-btn-entrar') as HTMLButtonElement,
        btnContinuarConvidado: document.getElementById('login-continuar-convidado') as HTMLButtonElement
    };

    attachAuthEvents(els, liberarEntrada);
    await iniciarSessao();
    const autenticado = isAutenticado();
    renderAuthStatus(els, autenticado, getUsuario());

    const destino = resolveEntryDestination(
        window.location.hash,
        autenticado,
        isAcessoConvidadoAutorizado(),
        hadTokenAtStartup
    );

    if (destino === 'login') {
        setEntryRoute('login');
        openModal('modal-login');
        els.emailInput.focus();
        await escolhaInicial;
    } else if (!window.location.hash || window.location.hash === LOGIN_ROUTE_HASH) {
        setEntryRoute('app');
    }
}
