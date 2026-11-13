import { html, raw } from '../../core/utils/html.js';
import { renderEmptyState } from '../../shared/components/emptyState.js';
import { gerarIniciais } from '../../core/utils/iniciais.js';
import { t } from '../../core/state/i18nStore.js';
import { loginPareceEmail, partesAutoria } from './logic.js';
import type { ItemComAutoria } from './logic.js';
import type { CampoCadastro, CampoOpcao } from './service.js';
import type { Equipamento, Usuario } from '../../types/index.js';

export function renderCampo(campo: CampoCadastro, opcoes: CampoOpcao[] | null): string {
    return campo.type === 'select' ? renderCampoSelect(campo, opcoes || []) : renderCampoTexto(campo);
}

/** Inline error slot for a field; filled by `mostrarErroCampo` in render.ts. */
function renderErroCampo(id: string): string {
    return html`<span class="form-error" id="${id}-erro" role="alert" hidden></span>`;
}

function renderCampoTexto(campo: CampoCadastro): string {
    const dica = campo.hint ? html`<small class="form-hint" id="${campo.id}-dica">${t(campo.hint)}</small>` : '';
    const descritoPor = campo.hint ? `${campo.id}-dica ${campo.id}-erro` : `${campo.id}-erro`;
    const extra = campo.type === 'email' ? ' autocomplete="off" inputmode="email"' : '';
    return html`
        <div class="form-group">
            <label for="${campo.id}">${t(campo.label)}</label>
            <input type="${campo.type}" id="${campo.id}" placeholder="${t(campo.placeholder || '')}" aria-describedby="${descritoPor}"${raw(extra)}>
            ${raw(dica)}
            ${raw(renderErroCampo(campo.id))}
        </div>
    `;
}

function renderCampoSelect(campo: CampoCadastro, opcoes: CampoOpcao[]): string {
    const opcoesHtml = opcoes.map((op) => html`<option value="${op.value}">${op.label}</option>`).join('');

    return html`
        <div class="form-group">
            <label for="${campo.id}">${t(campo.label)}</label>
            <select id="${campo.id}" aria-describedby="${campo.id}-erro">
                <option value="" disabled selected hidden>${t('cadastros.selecionar')}</option>
                ${raw(opcoesHtml)}
            </select>
            ${raw(renderErroCampo(campo.id))}
        </div>
    `;
}

/** Compact secondary line: "Label X · Label Y". Empty string when nothing to show. */
export function renderAutoria(item: ItemComAutoria, chaveCriado: string, chaveAtualizado?: string): string {
    const partes = partesAutoria(item, chaveCriado, chaveAtualizado);
    if (!partes.length) return '';
    return html`<span class="cadastro-autoria">${partes.map((p) => `${t(p.chave)} ${p.nome}`).join(' · ')}</span>`;
}

export function renderItemRegistro(texto: string, item?: ItemComAutoria): string {
    const autoria = item ? renderAutoria(item, 'autoria.cadastrado_por') : '';
    if (!autoria) return html`<div class="cadastro-modal-item">${texto}</div>`;
    return html`<div class="cadastro-modal-item cadastro-modal-item--autoria"><span>${texto}</span>${raw(autoria)}</div>`;
}

const NIVEL_LABEL: Record<string, string> = {
    ADMINISTRADOR: 'cadastros.administrador',
    EDITOR: 'cadastros.editor'
};

export interface OpcoesItemUsuario {
    /** Id of the signed-in user: self-deactivation is not offered (the API also refuses it). */
    usuarioAtualId?: number | null;
    /** Row currently showing the inline edit form. */
    editandoId?: number | null;
}

export function usuarioAtivo(usuario: Usuario): boolean {
    return usuario.ativo !== false;
}

function renderBotaoAcaoTexto(atributo: string, id: number, icone: string, texto: string): string {
    return html`<button type="button" class="cadastro-usuario-acao cadastro-usuario-acao--texto" ${raw(atributo)}="${id}">
            <span class="material-symbols-outlined" aria-hidden="true">${icone}</span>${texto}
        </button>`;
}

function renderFormEdicaoUsuario(usuario: Usuario, ehProprio: boolean): string {
    const opcoes = Object.entries(NIVEL_LABEL)
        .map(([valor, chave]) => html`<option value="${valor}"${raw(valor === usuario.nivelAcesso ? ' selected' : '')}>${t(chave)}</option>`)
        .join('');
    return html`
        <form class="cadastro-usuario-edit" data-editar-usuario-form="${usuario.id}" novalidate>
            <div class="form-group">
                <label for="edit-usuario-nome">${t('cadastros.campo_nome')}</label>
                <input type="text" id="edit-usuario-nome" value="${usuario.nome}" aria-describedby="edit-usuario-nome-erro">
                <span class="form-error" id="edit-usuario-nome-erro" role="alert" hidden></span>
            </div>
            <div class="form-group">
                <label for="edit-usuario-login">${t('cadastros.campo_email_login')}</label>
                <input type="email" id="edit-usuario-login" value="${usuario.login}" autocomplete="off" inputmode="email" aria-describedby="edit-usuario-login-erro">
                <span class="form-error" id="edit-usuario-login-erro" role="alert" hidden></span>
            </div>
            <div class="form-group">
                <label for="edit-usuario-nivel">${t('cadastros.campo_nivel_acesso')}</label>
                <select id="edit-usuario-nivel"${raw(ehProprio ? ' disabled' : '')}>${raw(opcoes)}</select>
            </div>
            <div class="cadastro-edit-acoes">
                <button type="button" class="btn btn-neutral" data-editar-usuario-cancelar>${t('shell.cancelar')}</button>
                <button type="submit" class="btn btn-success">${t('shell.salvar')}</button>
            </div>
        </form>
    `;
}

export function renderItemRegistroUsuario(usuario: Usuario, opcoes: OpcoesItemUsuario = {}): string {
    const ehProprio = usuario.id === opcoes.usuarioAtualId;
    const ativo = usuarioAtivo(usuario);

    if (opcoes.editandoId === usuario.id) {
        return html`<div class="cadastro-usuario-row cadastro-usuario-row--edicao">${raw(renderFormEdicaoUsuario(usuario, ehProprio))}</div>`;
    }

    const chip = usuario.possuiCartaoRfid
        ? html`<button type="button" class="cadastro-rfid-chip cadastro-rfid-chip--vinculado" data-rfid-usuario-id="${usuario.id}">
                <span class="material-symbols-outlined">contactless</span>${t('cadastros.cartao_vinculado')}
            </button>`
        : html`<button type="button" class="cadastro-rfid-chip" data-rfid-usuario-id="${usuario.id}">
                <span class="material-symbols-outlined">add_card</span>${t('cadastros.vincular_cartao')}
            </button>`;

    const badgeInativo = ativo ? '' : html`<span class="cadastro-badge cadastro-badge--inativo">${t('cadastros.inativo')}</span>`;
    const badgeEmail = loginPareceEmail(usuario.login)
        ? ''
        : html`<span class="cadastro-badge cadastro-badge--aviso"><span class="material-symbols-outlined" aria-hidden="true">warning</span>${t('cadastros.sem_email_valido')}</span>`;
    const badges = badgeInativo || badgeEmail ? html`<span class="cadastro-badges">${raw(badgeInativo)}${raw(badgeEmail)}</span>` : '';

    const botaoStatus = ehProprio
        ? ''
        : ativo
            ? renderBotaoAcaoTexto('data-desativar-usuario-id', usuario.id, 'person_off', t('cadastros.desativar'))
            : renderBotaoAcaoTexto('data-reativar-usuario-id', usuario.id, 'person_check', t('cadastros.reativar'));

    return html`
        <div class="cadastro-usuario-row${raw(ativo ? '' : ' cadastro-usuario-row--inativo')}">
            <span class="cadastro-usuario-avatar">${gerarIniciais(usuario.nome)}</span>
            <div class="cadastro-usuario-info">
                <span class="cadastro-usuario-nome">${usuario.nome}</span>
                <span class="cadastro-usuario-meta">${usuario.login} · ${t(NIVEL_LABEL[usuario.nivelAcesso] ?? usuario.nivelAcesso)}</span>
                ${raw(badges)}
                ${raw(renderAutoria(usuario, 'cadastros.criado_por', 'autoria.atualizado_por'))}
            </div>
            <div class="cadastro-usuario-acoes">
                ${raw(renderBotaoAcaoTexto('data-editar-usuario-id', usuario.id, 'edit', t('cadastros.editar')))}
                ${raw(botaoStatus)}
                <button type="button" class="cadastro-usuario-acao" data-reset-senha-usuario-id="${usuario.id}"
                    title="${t('cadastros.redefinir_senha')}" aria-label="${t('cadastros.redefinir_senha')}">
                    <span class="material-symbols-outlined" aria-hidden="true">lock_reset</span>
                </button>
                ${raw(chip)}
            </div>
        </div>
    `;
}

export interface OpcoesItemEquipamento {
    ajustandoId?: number | null;
}

export function textoEquipamento(eq: Equipamento): string {
    return `${eq.categoria?.nome ?? '—'} — ${eq.modelo} (${eq.quantidadeDisponivel}/${eq.quantidadeTotal})`;
}

export function renderItemRegistroEquipamento(eq: Equipamento, opcoes: OpcoesItemEquipamento = {}): string {
    const texto = textoEquipamento(eq);
    if (opcoes.ajustandoId === eq.id) {
        return html`
            <div class="cadastro-modal-item cadastro-modal-item--ajuste">
                <form class="cadastro-ajuste-form" data-ajustar-total-form="${eq.id}" novalidate>
                    <span class="cadastro-item-texto">${texto}</span>
                    <div class="form-group">
                        <label for="ajuste-total-valor">${t('cadastros.novo_total')}</label>
                        <input type="number" id="ajuste-total-valor" min="1" step="1" value="${eq.quantidadeTotal}" aria-describedby="ajuste-total-valor-erro">
                        <span class="form-error" id="ajuste-total-valor-erro" role="alert" hidden></span>
                    </div>
                    <div class="cadastro-edit-acoes">
                        <button type="button" class="btn btn-neutral" data-ajustar-total-cancelar>${t('shell.cancelar')}</button>
                        <button type="submit" class="btn btn-success">${t('shell.salvar')}</button>
                    </div>
                </form>
            </div>
        `;
    }
    return html`
        <div class="cadastro-modal-item cadastro-modal-item--acao">
            <span class="cadastro-item-texto">${texto}${raw(renderAutoria(eq, 'autoria.cadastrado_por', 'autoria.atualizado_por'))}</span>
            ${raw(renderBotaoAcaoTexto('data-ajustar-total-id', eq.id, 'tune', t('cadastros.ajustar_total')))}
        </div>
    `;
}

export function renderListaVazia(): string {
    return renderEmptyState({
        containerClass: 'cadastro-modal-empty',
        titulo: t('cadastros.nenhum_registro_cadastrado'),
        tituloTag: null
    });
}

export function renderListaCarregando(): string {
    return html`<div class="cadastro-modal-empty">${t('cadastros.carregando')}</div>`;
}

export function renderListaErro(): string {
    return html`<div class="cadastro-modal-empty">${t('cadastros.nao_foi_possivel_carregar_os_registros')}</div>`;
}
