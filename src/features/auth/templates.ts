import { html } from '../../core/utils/html.js';
import { gerarIniciais } from '../../core/utils/iniciais.js';
import { t } from '../../core/state/i18nStore.js';
import type { AuthUser } from '../../types/index.js';

export function renderUserMenuAutenticado(usuario: AuthUser): string {
    const nivelLabel = usuario.nivelAcesso === 'ADMINISTRADOR' ? t('cadastros.administrador') : t('cadastros.editor');

    return html`
        <button type="button" class="user-menu-trigger" id="user-menu-trigger"
            aria-expanded="false" aria-haspopup="true" aria-controls="user-menu-dropdown">
            <span class="user-menu-avatar">${gerarIniciais(usuario.nome)}</span>
            <span class="user-menu-info">
                <span class="user-menu-name">${usuario.nome}</span>
                <span class="user-menu-role">${nivelLabel}</span>
            </span>
            <span class="material-symbols-outlined user-menu-chevron">expand_more</span>
        </button>
        <div class="user-menu-dropdown" id="user-menu-dropdown">
            <a href="#" class="user-menu-item nav-link" data-panel="panel-perfil">
                <span class="icon-badge icon-badge--sm icon-badge--neutral">
                    <span class="material-symbols-outlined">person</span>
                </span>
                ${t('auth.meu_perfil')}
            </a>
            <a href="#" class="user-menu-item nav-link" data-panel="panel-seguranca">
                <span class="icon-badge icon-badge--sm icon-badge--neutral">
                    <span class="material-symbols-outlined">lock</span>
                </span>
                ${t('shell.seguranca_da_conta')}
            </a>
            <button type="button" class="user-menu-item user-menu-item-danger" id="btn-user-menu-sair">
                <span class="icon-badge icon-badge--sm icon-badge--error">
                    <span class="material-symbols-outlined">logout</span>
                </span>
                ${t('auth.sair')}
            </button>
        </div>
    `;
}

export function renderUserMenuConvidado(): string {
    return html`
        <span class="user-menu-avatar user-menu-avatar-guest">
            <span class="material-symbols-outlined">person</span>
        </span>
        <span class="user-menu-info">
            <span class="user-menu-name">${t('auth.modo_convidado')}</span>
        </span>
        <button type="button" class="auth-status-action" id="btn-auth-toggle">
            <span class="material-symbols-outlined">login</span> ${t('auth.login')}
        </button>
    `;
}
