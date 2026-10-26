import { closeModal, openModal, showToast } from '../../core/ui/index.js';
import { entrar, entrarComoConvidado, sair, isAutenticado, isModoConvidadoPersistido, persistirModoConvidado, subscribe } from '../../core/state/authStore.js';
import { isLoginRoute, resolveEntryDestination, setEntryRoute } from '../../core/layout/entryRoute.js';
import { renderAuthStatus, mostrarErroLogin } from './render.js';
import type { AuthEls } from './render.js';
import { traduzirErro, t } from "../../core/state/i18nStore.js";
import { setButtonLoading } from '../../shared/dom/buttonLoading.js';
import { definirIdioma, getIdioma, subscribe as subscribeI18n } from '../../core/state/i18nStore.js';
import { definirTema, getPreferenciaTema, subscribe as subscribeTheme } from '../../core/state/themeStore.js';

export function attachAuthEvents(els: AuthEls, onInitialAccess: () => void = () => undefined): void {
    els.sidebarFooter.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        const trigger = target.closest<HTMLElement>('#user-menu-trigger');
        if (trigger) {
            e.stopPropagation();
            const dropdown = document.getElementById('user-menu-dropdown');
            const aberto = dropdown?.classList.toggle('active');
            trigger.setAttribute('aria-expanded', String(!!aberto));
            return;
        }

        if (target.closest('#btn-user-menu-sair')) {
            fecharDropdown();
            sair();
            persistirModoConvidado(true);
            setEntryRoute('app');
            showToast('Sessão encerrada. Você voltou ao Modo Convidado.', 'success');
            return;
        }

        if (target.closest('#btn-auth-toggle')) {
            mostrarTelaLogin(els);
            return;
        }

        if (target.closest('.user-menu-item.nav-link')) {
            fecharDropdown();
        }
    });

    document.addEventListener('click', (e) => {
        const target = e.target as Node;
        if (!els.sidebarFooter.contains(target)) fecharDropdown();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharDropdown();
    });

    els.btnHeroLogin?.addEventListener('click', () => {
        if (isAutenticado()) {
            sair();
            persistirModoConvidado(true);
            setEntryRoute('app');
            showToast('Sessão encerrada. Você voltou ao Modo Convidado.', 'success');
            return;
        }
        mostrarTelaLogin(els);
    });

    els.btnContinuarConvidado.addEventListener('click', () => {
        entrarComoConvidado();
        mostrarErroLogin(els, '');
        setEntryRoute('app');
        closeModal('modal-login');
        onInitialAccess();
    });
    els.form.addEventListener('submit', (event) => {
        event.preventDefault();
        void fazerLogin(els, onInitialAccess);
    });
    els.emailInput.addEventListener('input', () => mostrarErroLogin(els, ''));
    els.senhaInput.addEventListener('input', () => mostrarErroLogin(els, ''));
    window.addEventListener('hashchange', () => sincronizarRotaLogin(els));
    attachEntryPreferences();

    subscribe(({ autenticado, usuario }) => renderAuthStatus(els, autenticado, usuario));
}

function attachEntryPreferences(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-entry-language]').forEach((button) => {
        button.addEventListener('click', () => {
            const idioma = button.dataset.entryLanguage;
            if (idioma === 'pt' || idioma === 'en') definirIdioma(idioma);
        });
    });

    document.querySelectorAll<HTMLButtonElement>('[data-entry-theme]').forEach((button) => {
        button.addEventListener('click', () => {
            const tema = button.dataset.entryTheme;
            if (tema === 'light' || tema === 'dark' || tema === 'system') definirTema(tema);
        });
    });

    updateEntryLanguageSelection();
    updateEntryThemeSelection();
    subscribeI18n(updateEntryLanguageSelection);
    subscribeTheme(updateEntryThemeSelection);
}

function updateEntryLanguageSelection(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-entry-language]').forEach((button) => {
        const active = button.dataset.entryLanguage === getIdioma();
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

function updateEntryThemeSelection(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-entry-theme]').forEach((button) => {
        const active = button.dataset.entryTheme === getPreferenciaTema();
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

function mostrarTelaLogin(els: AuthEls): void {
    mostrarErroLogin(els, '');
    setEntryRoute('login');
    const modal = document.getElementById('modal-login');
    if (!modal?.classList.contains('active')) openModal('modal-login');
    els.emailInput.focus();
}

function sincronizarRotaLogin(els: AuthEls): void {
    const destino = resolveEntryDestination(
        window.location.hash,
        isAutenticado(),
        isModoConvidadoPersistido(),
        false
    );

    if (destino === 'login') {
        mostrarTelaLogin(els);
        return;
    }

    if (isLoginRoute()) setEntryRoute('app');
    if (document.getElementById('modal-login')?.classList.contains('active')) {
        closeModal('modal-login');
    }
}

function fecharDropdown(): void {
    document.getElementById('user-menu-dropdown')?.classList.remove('active');
    document.getElementById('user-menu-trigger')?.setAttribute('aria-expanded', 'false');
}

async function fazerLogin(els: AuthEls, onInitialAccess: () => void): Promise<void> {
    if (els.btnEntrar.disabled) return;
    const login = els.emailInput.value.trim();
    const senha = els.senhaInput.value;

    if (!login || !senha) {
        mostrarErroLogin(els, t('auth.informe_login_senha'));
        return;
    }

    setButtonLoading(els.btnEntrar, true);
    els.btnContinuarConvidado.disabled = true;
    try {
        await entrar(login, senha);
        setEntryRoute('app');
        closeModal('modal-login');
        els.emailInput.value = '';
        els.senhaInput.value = '';
        showToast(t('feedback.login_realizado'), 'success');
        onInitialAccess();
    } catch (erro) {
        mostrarErroLogin(els, traduzirErro(erro, 'feedback.erro_entrar'));
    } finally {
        setButtonLoading(els.btnEntrar, false);
        els.btnContinuarConvidado.disabled = false;
    }
}
