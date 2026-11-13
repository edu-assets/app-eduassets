import { html, raw } from '../../core/utils/html.js';
import { renderEmptyState, renderEmptyStateSemResultados } from '../../shared/components/emptyState.js';
import { gerarIniciais } from '../../core/utils/iniciais.js';
import { t } from '../../core/state/i18nStore.js';
import { loginPareceEmail, partesAutoria } from './logic.js';
import type { ItemComAutoria } from './logic.js';
import type { CampoCadastro, CampoOpcao } from './service.js';
import type { Categoria, Equipamento, Responsavel, Usuario } from '../../types/index.js';

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
    const extra = campo.type === 'email'
        ? ' autocomplete="off" inputmode="email"'
        : campo.type === 'password' ? ' autocomplete="new-password"' : '';
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
}

export function usuarioAtivo(usuario: Usuario): boolean {
    return usuario.ativo !== false;
}

function renderBotaoAcaoTexto(atributo: string, id: number, icone: string, texto: string): string {
    return html`<button type="button" class="cadastro-usuario-acao cadastro-usuario-acao--texto" ${raw(atributo)}="${id}">
            <span class="material-symbols-outlined" aria-hidden="true">${icone}</span>${texto}
        </button>`;
}

/** Id of the edit form hosted in the Cadastros sheet's detail view; the pinned footer submit targets it via `form=`. */
export const ID_FORM_EDICAO = 'cadastro-edicao-form';

/** Footer of the detail view: Cancelar (back to the list) + primary Salvar, submitting `ID_FORM_EDICAO`. */
export function renderRodapeEdicao(): string {
    return html`
        <button type="button" class="btn btn-neutral" data-edicao-voltar>${t('shell.cancelar')}</button>
        <button type="submit" class="btn btn-success" form="${ID_FORM_EDICAO}" data-edicao-salvar>
            <span class="material-symbols-outlined" aria-hidden="true">save</span>${t('shell.salvar')}
        </button>
    `;
}

export function renderFormEdicaoUsuario(usuario: Usuario, ehProprio: boolean): string {
    const opcoes = Object.entries(NIVEL_LABEL)
        .map(([valor, chave]) => html`<option value="${valor}"${raw(valor === usuario.nivelAcesso ? ' selected' : '')}>${t(chave)}</option>`)
        .join('');
    return html`
        <form class="cadastro-edicao-form" id="${ID_FORM_EDICAO}" data-editar-usuario-form="${usuario.id}" novalidate>
            <div class="form-group">
                <label for="edit-usuario-nome">${t('cadastros.campo_nome')}</label>
                <input type="text" id="edit-usuario-nome" value="${usuario.nome}" autocomplete="off" aria-describedby="edit-usuario-nome-erro">
                <span class="form-error" id="edit-usuario-nome-erro" role="alert" hidden></span>
            </div>
            <div class="form-group">
                <label for="edit-usuario-login">${t('cadastros.campo_email_login')}</label>
                <input type="email" id="edit-usuario-login" value="${usuario.login}" autocomplete="off" inputmode="email" autocapitalize="off" spellcheck="false" aria-describedby="edit-usuario-login-erro">
                <span class="form-error" id="edit-usuario-login-erro" role="alert" hidden></span>
            </div>
            <div class="form-group">
                <label for="edit-usuario-nivel">${t('cadastros.campo_nivel_acesso')}</label>
                <select id="edit-usuario-nivel"${raw(ehProprio ? ' disabled' : '')}>${raw(opcoes)}</select>
            </div>
        </form>
    `;
}

export function renderItemRegistroUsuario(usuario: Usuario, opcoes: OpcoesItemUsuario = {}): string {
    const ehProprio = usuario.id === opcoes.usuarioAtualId;
    const ativo = usuarioAtivo(usuario);

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

export function textoEquipamento(eq: Equipamento): string {
    return `${eq.categoria?.nome ?? '—'} — ${eq.modelo} (${eq.quantidadeDisponivel}/${eq.quantidadeTotal})`;
}

export function renderFormAjusteTotal(eq: Equipamento): string {
    return html`
        <form class="cadastro-edicao-form" id="${ID_FORM_EDICAO}" data-ajustar-total-form="${eq.id}" novalidate>
            <div class="form-group">
                <label for="ajuste-total-valor">${t('cadastros.novo_total')}</label>
                <input type="number" id="ajuste-total-valor" min="1" step="1" inputmode="numeric" value="${eq.quantidadeTotal}" aria-describedby="ajuste-total-valor-erro">
                <span class="form-error" id="ajuste-total-valor-erro" role="alert" hidden></span>
            </div>
        </form>
    `;
}

export function renderItemRegistroEquipamento(eq: Equipamento): string {
    return html`
        <div class="cadastro-modal-item cadastro-modal-item--acao">
            <span class="cadastro-item-texto">${textoEquipamento(eq)}${raw(renderAutoria(eq, 'autoria.cadastrado_por', 'autoria.atualizado_por'))}</span>
            <span class="cadastro-item-acoes">${raw(renderBotaoAcaoTexto('data-ajustar-total-id', eq.id, 'tune', t('cadastros.ajustar_total')))}</span>
        </div>
    `;
}

/* ===== Categorias (rename) e responsáveis (edit/deactivate) ===== */

export function responsavelAtivo(r: Responsavel): boolean {
    return r.ativo !== false;
}

export function textoCategoria(c: Categoria): string {
    return c.nome;
}

export function textoResponsavel(r: Responsavel): string {
    return `${r.nome} — ${r.cargo}${responsavelAtivo(r) ? '' : ` ${t('cadastros.inativo')}`}`;
}

export function renderFormRenomearCategoria(c: Categoria): string {
    return html`
        <form class="cadastro-edicao-form" id="${ID_FORM_EDICAO}" data-renomear-categoria-form="${c.id}" novalidate>
            <div class="form-group">
                <label for="edit-categoria-nome">${t('cadastros.campo_nome_categoria_novo')}</label>
                <input type="text" id="edit-categoria-nome" value="${c.nome}" autocomplete="off" aria-describedby="edit-categoria-nome-erro">
                <span class="form-error" id="edit-categoria-nome-erro" role="alert" hidden></span>
            </div>
        </form>
    `;
}

export function renderItemRegistroCategoria(c: Categoria): string {
    return html`
        <div class="cadastro-modal-item cadastro-modal-item--acao">
            <span class="cadastro-item-texto">${c.nome}${raw(renderAutoria(c, 'autoria.cadastrado_por'))}</span>
            <span class="cadastro-item-acoes">${raw(renderBotaoAcaoTexto('data-renomear-categoria-id', c.id, 'edit', t('cadastros.renomear')))}</span>
        </div>
    `;
}

export function renderFormEdicaoResponsavel(r: Responsavel): string {
    return html`
        <form class="cadastro-edicao-form" id="${ID_FORM_EDICAO}" data-editar-responsavel-form="${r.id}" novalidate>
            <div class="form-group">
                <label for="edit-responsavel-nome">${t('cadastros.campo_nome')}</label>
                <input type="text" id="edit-responsavel-nome" value="${r.nome}" autocomplete="off" aria-describedby="edit-responsavel-nome-erro">
                <span class="form-error" id="edit-responsavel-nome-erro" role="alert" hidden></span>
            </div>
            <div class="form-group">
                <label for="edit-responsavel-cargo">${t('cadastros.campo_cargo')}</label>
                <input type="text" id="edit-responsavel-cargo" value="${r.cargo}" autocomplete="off" aria-describedby="edit-responsavel-cargo-erro">
                <span class="form-error" id="edit-responsavel-cargo-erro" role="alert" hidden></span>
            </div>
        </form>
    `;
}

export function renderItemRegistroResponsavel(r: Responsavel): string {
    const ativo = responsavelAtivo(r);
    const badge = ativo ? '' : html`<span class="cadastro-badge cadastro-badge--inativo">${t('cadastros.inativo')}</span>`;
    const botaoStatus = ativo
        ? renderBotaoAcaoTexto('data-desativar-responsavel-id', r.id, 'person_off', t('cadastros.desativar'))
        : renderBotaoAcaoTexto('data-reativar-responsavel-id', r.id, 'person_check', t('cadastros.reativar'));
    return html`
        <div class="cadastro-modal-item cadastro-modal-item--acao${raw(ativo ? '' : ' cadastro-usuario-row--inativo')}">
            <span class="cadastro-item-texto">${r.nome} — ${r.cargo} ${raw(badge)}${raw(renderAutoria(r, 'autoria.cadastrado_por', 'autoria.atualizado_por'))}</span>
            <span class="cadastro-item-acoes">
                ${raw(renderBotaoAcaoTexto('data-editar-responsavel-id', r.id, 'edit', t('cadastros.editar')))}
                ${raw(botaoStatus)}
            </span>
        </div>
    `;
}

/** `termoBusca`: busca ativa que zerou a lista => "sem resultados" com Limpar busca (em vez de "nada cadastrado"). */
export function renderListaVazia(termoBusca = ''): string {
    if (termoBusca.trim()) {
        return renderEmptyStateSemResultados({ consulta: termoBusca, containerClass: 'cadastro-modal-empty', limpar: 'busca' });
    }
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
