import { html } from '../../core/utils/html.js';
import { gerarIniciais } from '../../core/utils/iniciais.js';

export function renderUserMenuAutenticado(usuario) {
    const nivelLabel = usuario.nivelAcesso === 'ADMINISTRADOR' ? 'Administrador' : 'Editor';

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
                <span class="material-symbols-outlined">person</span> Meu perfil
            </a>
            <a href="#" class="user-menu-item nav-link" data-panel="panel-seguranca">
                <span class="material-symbols-outlined">lock</span> Segurança
            </a>
            <button type="button" class="user-menu-item user-menu-item-danger" id="btn-user-menu-sair">
                <span class="material-symbols-outlined">logout</span> Sair
            </button>
        </div>
    `;
}

export function renderUserMenuConvidado() {
    return html`
        <span class="user-menu-avatar user-menu-avatar-guest">
            <span class="material-symbols-outlined">person</span>
        </span>
        <span class="user-menu-info">
            <span class="user-menu-name">Modo Convidado</span>
        </span>
        <button type="button" class="auth-status-action" id="btn-auth-toggle">
            <span class="material-symbols-outlined">login</span> Login
        </button>
    `;
}