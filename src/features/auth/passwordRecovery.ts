import { solicitarRecuperacaoSenha, redefinirSenhaComToken } from '../../core/api/auth.js';
import { supportsPasswordRecovery } from '../../core/api/apiClient.js';
import { isAutenticado } from '../../core/state/authStore.js';
import { t, traduzirErro, getIdioma } from '../../core/state/i18nStore.js';
import { showToast } from '../../core/ui/index.js';
import { setButtonLoading } from '../../shared/dom/buttonLoading.js';
import { validarNovaSenha } from '../cadastros/service.js';

const TOKEN_HASH_PATTERN = /^#redefinir-senha=([A-Za-z0-9_-]{43})$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Vista = 'login' | 'recuperar' | 'redefinir';

export function extrairTokenRecuperacao(hash: string): string | null {
    return TOKEN_HASH_PATTERN.exec(hash)?.[1] ?? null;
}

/**
 * Reads the emailed recovery token from the URL fragment and immediately replaces it with #login,
 * so the token does not stay in the address bar or in the browser history.
 */
export function consumirTokenRecuperacaoDaUrl(): string | null {
    const token = extrairTokenRecuperacao(window.location.hash);
    if (token) {
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#login`);
    }
    return token;
}

function el<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

function mostrarVista(vista: Vista): void {
    const formularios: Record<Vista, HTMLFormElement | null> = {
        login: el<HTMLFormElement>('login-form'),
        recuperar: el<HTMLFormElement>('recuperar-senha-form'),
        redefinir: el<HTMLFormElement>('redefinir-senha-form'),
    };
    (Object.keys(formularios) as Vista[]).forEach((nome) => {
        const form = formularios[nome];
        if (form) form.hidden = nome !== vista;
    });
    const foco = { login: 'login-email', recuperar: 'recuperar-email', redefinir: 'redefinir-nova' }[vista];
    el<HTMLInputElement>(foco)?.focus();
}

/** Returns the login card to the sign-in form (used whenever the login screen is reopened). */
export function mostrarFormularioLogin(): void {
    if (el('login-form')?.hidden) mostrarVista('login');
}

export interface PasswordRecoveryControl {
    temToken: boolean;
    focar(): void;
}

export function initPasswordRecovery(tokenInicial: string | null): PasswordRecoveryControl {
    const link = el<HTMLButtonElement>('login-esqueci-senha');
    const recuperarForm = el<HTMLFormElement>('recuperar-senha-form');
    const redefinirForm = el<HTMLFormElement>('redefinir-senha-form');
    const emailLogin = el<HTMLInputElement>('login-email');
    const email = el<HTMLInputElement>('recuperar-email');
    const recuperarErro = el<HTMLElement>('recuperar-erro');
    const enviado = el<HTMLElement>('recuperar-enviado');
    const btnEnviar = el<HTMLButtonElement>('recuperar-enviar');
    const nova = el<HTMLInputElement>('redefinir-nova');
    const confirmar = el<HTMLInputElement>('redefinir-confirmar');
    const redefinirErro = el<HTMLElement>('redefinir-erro');
    const btnSalvar = el<HTMLButtonElement>('redefinir-salvar');
    if (!link || !recuperarForm || !redefinirForm || !email || !recuperarErro || !enviado || !btnEnviar
        || !nova || !confirmar || !redefinirErro || !btnSalvar) {
        return { temToken: false, focar: () => undefined };
    }

    let token = tokenInicial;

    void supportsPasswordRecovery().then((disponivel) => { link.hidden = !disponivel; });

    link.addEventListener('click', () => {
        const informado = emailLogin?.value.trim() ?? '';
        if (EMAIL_PATTERN.test(informado)) email.value = informado;
        recuperarErro.textContent = '';
        enviado.hidden = true;
        mostrarVista('recuperar');
    });

    document.querySelectorAll<HTMLButtonElement>('[data-voltar-login]').forEach((botao) => {
        botao.addEventListener('click', () => mostrarVista('login'));
    });

    email.addEventListener('input', () => { recuperarErro.textContent = ''; });
    [nova, confirmar].forEach((campo) => campo.addEventListener('input', () => { redefinirErro.textContent = ''; }));

    recuperarForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (btnEnviar.disabled) return;
        const valor = email.value.trim();
        if (!EMAIL_PATTERN.test(valor)) {
            recuperarErro.textContent = t('auth.informe_email_valido');
            email.focus();
            return;
        }
        recuperarErro.textContent = '';
        enviado.hidden = true;
        setButtonLoading(btnEnviar, true);
        void solicitarRecuperacaoSenha(valor, getIdioma() === 'en' ? 'en' : 'pt')
            .then(() => { enviado.hidden = false; })
            .catch((erro: unknown) => { recuperarErro.textContent = traduzirErro(erro, 'feedback.erro_recuperar_senha'); })
            .finally(() => setButtonLoading(btnEnviar, false));
    });

    redefinirForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (btnSalvar.disabled) return;
        if (!token) {
            redefinirErro.textContent = t('backend.auth.link_recuperacao_invalido');
            return;
        }
        const problema = validarNovaSenha(nova.value, confirmar.value);
        if (problema) {
            redefinirErro.textContent = t(problema);
            return;
        }
        setButtonLoading(btnSalvar, true);
        void redefinirSenhaComToken(token, nova.value)
            .then(() => {
                token = null;
                nova.value = '';
                confirmar.value = '';
                if (isAutenticado()) {
                    // The reset revoked every session, including this browser's; start clean.
                    window.location.reload();
                    return;
                }
                mostrarVista('login');
                showToast(t('feedback.senha_recuperada'), 'success');
            })
            .catch((erro: unknown) => { redefinirErro.textContent = traduzirErro(erro, 'feedback.erro_redefinir_senha'); })
            .finally(() => setButtonLoading(btnSalvar, false));
    });

    return {
        temToken: Boolean(tokenInicial),
        focar: () => mostrarVista(tokenInicial ? 'redefinir' : 'login'),
    };
}
