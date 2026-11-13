import type { Autor, NivelAcesso, ResponsavelUpdatePayload, UsuarioUpdatePayload } from '../../types/index.js';
import { senhaAtendeRegras } from '../../shared/components/passwordField.js';

/** Same rule of thumb the API uses for `login` (a plain e-mail shape). */
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:[.][A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

export function loginPareceEmail(login: string): boolean {
    return EMAIL_RE.test(login.trim());
}

export { normalizarBusca, filtrarPorBusca } from '../../core/utils/busca.js';

/* ===== Per-field validation (returns i18n keys by field id) ===== */

export interface CampoValidavel {
    id: string;
    type: string;
}

export type ErrosCampos = Record<string, string>;

export function validarCamposCadastro(campos: CampoValidavel[], valores: Record<string, string>): ErrosCampos {
    const erros: ErrosCampos = {};
    for (const campo of campos) {
        const valor = (valores[campo.id] ?? '').trim();
        if (!valor) {
            erros[campo.id] = 'validation.cadastros.campo_obrigatorio';
        } else if (campo.type === 'email' && !loginPareceEmail(valor)) {
            erros[campo.id] = 'validation.cadastros.email_invalido';
        } else if (campo.type === 'number' && !/^[1-9]\d*$/.test(valor)) {
            erros[campo.id] = 'validation.cadastros.quantidade_invalida';
        }
    }
    return erros;
}

/* ===== User edit ===== */

export interface UsuarioEditavel {
    nome: string;
    login: string;
    nivelAcesso: NivelAcesso;
}

/** Only changed fields are sent; an unchanged legacy login is never re-validated by the API. */
export function montarPayloadAtualizacaoUsuario(
    original: UsuarioEditavel,
    valores: { nome: string; login: string; nivelAcesso: string }
): UsuarioUpdatePayload {
    const payload: UsuarioUpdatePayload = {};
    const nome = valores.nome.trim();
    const login = valores.login.trim();
    if (nome !== original.nome) payload.nome = nome;
    if (login !== original.login) payload.login = login;
    if (valores.nivelAcesso !== original.nivelAcesso) payload.nivelAcesso = valores.nivelAcesso as NivelAcesso;
    return payload;
}

export function validarEdicaoUsuario(
    original: UsuarioEditavel,
    valores: { nome: string; login: string }
): ErrosCampos {
    const erros: ErrosCampos = {};
    if (!valores.nome.trim()) erros['edit-usuario-nome'] = 'validation.cadastros.campo_obrigatorio';
    const login = valores.login.trim();
    if (!login) erros['edit-usuario-login'] = 'validation.cadastros.campo_obrigatorio';
    else if (login !== original.login && !loginPareceEmail(login)) erros['edit-usuario-login'] = 'validation.cadastros.email_invalido';
    return erros;
}

/* ===== New user password ===== */

/** Client-side mirror of the API password policy for the new-user form; returns an i18n key or null. */
export function validarSenhaNovoUsuario(senha: string): string | null {
    return senhaAtendeRegras(senha) ? null : 'validation.cadastros.senha_fraca';
}

/* ===== Category rename / responsible edit ===== */

export function validarRenomearCategoria(original: string, nome: string): string | null {
    return nome.trim() ? null : 'validation.cadastros.campo_obrigatorio';
}

/** Returns the trimmed new name, or null when unchanged. */
export function nomeCategoriaAlterado(original: string, nome: string): string | null {
    const novo = nome.trim();
    return novo && novo !== original ? novo : null;
}

export function montarPayloadAtualizacaoResponsavel(
    original: { nome: string; cargo: string },
    valores: { nome: string; cargo: string }
): ResponsavelUpdatePayload {
    const payload: ResponsavelUpdatePayload = {};
    const nome = valores.nome.trim();
    const cargo = valores.cargo.trim();
    if (nome !== original.nome) payload.nome = nome;
    if (cargo !== original.cargo) payload.cargo = cargo;
    return payload;
}

export function validarEdicaoResponsavel(valores: { nome: string; cargo: string }): ErrosCampos {
    const erros: ErrosCampos = {};
    if (!valores.nome.trim()) erros['edit-responsavel-nome'] = 'validation.cadastros.campo_obrigatorio';
    if (!valores.cargo.trim()) erros['edit-responsavel-cargo'] = 'validation.cadastros.campo_obrigatorio';
    return erros;
}

/* ===== Equipment total adjustment ===== */

export interface EstoqueEquipamento {
    quantidadeTotal: number;
    quantidadeDisponivel: number;
}

/** Items not available on the shelf (loans, maintenance, broken): the new total can't go below this. */
export function quantidadeEmUso(eq: EstoqueEquipamento): number {
    return Math.max(0, eq.quantidadeTotal - eq.quantidadeDisponivel);
}

export type ResultadoAjusteTotal =
    | { ok: true; payload: { quantidadeTotal: number } }
    | { ok: false; erro: string; emUso?: number };

/**
 * Only `quantidadeTotal` is sent: the API applies the delta to `quantidadeDisponivel` under a row lock
 * and answers 409 when the total is below the units in use. The local check is just a quick hint.
 */
export function montarPayloadAjusteTotal(eq: EstoqueEquipamento, novoTotal: number): ResultadoAjusteTotal {
    if (!Number.isInteger(novoTotal) || novoTotal < 1) {
        return { ok: false, erro: 'validation.cadastros.quantidade_invalida' };
    }
    const emUso = quantidadeEmUso(eq);
    if (novoTotal < emUso) {
        return { ok: false, erro: 'validation.cadastros.total_abaixo_em_uso', emUso };
    }
    return { ok: true, payload: { quantidadeTotal: novoTotal } };
}

/* ===== Authorship line ===== */

export interface ItemComAutoria {
    criadoPor?: Autor | null;
    atualizadoPor?: Autor | null;
}

export interface PartesAutoria {
    chave: string;
    /** Author name, or '—' when the API sent null. */
    nome: string;
}

/** Absent fields are omitted; a null creator becomes '—'; the updater line shows only on edited records. */
export function partesAutoria(item: ItemComAutoria, chaveCriado: string, chaveAtualizado?: string): PartesAutoria[] {
    const partes: PartesAutoria[] = [];
    if (item.criadoPor !== undefined) partes.push({ chave: chaveCriado, nome: item.criadoPor?.nome ?? '—' });
    if (chaveAtualizado && item.atualizadoPor != null) partes.push({ chave: chaveAtualizado, nome: item.atualizadoPor?.nome ?? '—' });
    return partes;
}
