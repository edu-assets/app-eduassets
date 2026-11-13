import { aoTrocarSessao } from '../../core/state/sessionChange.js';
import { closeModal, showToast, confirmarExclusao } from '../../core/ui/index.js';
import {
    getConfig,
    listarRegistros,
    criarRegistro,
    carregarOpcoesCampo,
    formatarItem,
    gerarCartaoRfid,
    revogarCartaoRfid,
    validarNovaSenha,
    redefinirSenhaUsuario,
    atualizarUsuario,
    ajustarTotalEquipamento,
    textoBuscaUsuario,
    renomearCategoria,
    atualizarResponsavel
} from './service.js';
import {
    abrirModalCadastro,
    exibirListaCarregando,
    exibirListaErro,
    renderListaRegistros,
    renderListaUsuarios,
    renderListaEquipamentos,
    renderListaCategorias,
    renderListaResponsaveis,
    aplicarErrosCampos,
    mostrarErroCampo,
    limparCamposFormulario,
    abrirModalRfid,
    exibirModoGravacao,
    exibirCartaoRevogado,
    fecharModalRfid,
    abrirModalResetSenha,
    fecharModalResetSenha
} from './render.js';
import { bloquearSeNaoAdmin } from '../../core/auth/guestGate.js';
import { getUsuario } from '../../core/state/authStore.js';
import type { CampoCadastro } from './service.js';
import type { CampoComOpcoes, RfidModalEls, ResetSenhaModalEls } from './render.js';
import type { Categoria, Equipamento, Responsavel, Usuario } from '../../types/index.js';
import {
    filtrarPorBusca,
    validarCamposCadastro,
    validarEdicaoUsuario,
    montarPayloadAtualizacaoUsuario,
    montarPayloadAjusteTotal,
    validarSenhaNovoUsuario,
    validarRenomearCategoria,
    nomeCategoriaAlterado,
    validarEdicaoResponsavel,
    montarPayloadAtualizacaoResponsavel
} from './logic.js';
import type { ItemComAutoria } from './logic.js';
import { textoEquipamento, textoCategoria, textoResponsavel } from './templates.js';
import { traduzirErro, t } from '../../core/state/i18nStore.js';
import { getEquipamentos, carregarEquipamentos } from '../../core/state/equipamentoStore.js';
import { carregarResponsaveis } from '../../core/state/responsavelStore.js';
import { setButtonLoading } from '../../shared/dom/buttonLoading.js';

export interface CadastrosEls {
    cards: NodeListOf<HTMLElement>;
    titulo: HTMLElement;
    subtitulo: HTMLElement | null;
    headerIcone: HTMLElement | null;
    headerIconeSymbol: HTMLElement | null;
    camposWrap: HTMLElement;
    listaWrap: HTMLElement;
    btnCancelar: HTMLElement | null;
    btnSalvar: HTMLButtonElement | null;
    busca?: HTMLInputElement | null;
    rfidModal: RfidModalEls;
    resetSenhaModal: ResetSenhaModalEls;
}

export interface CadastrosEstado {
    tipoAtual: string | null;
}

let usuariosCache: Usuario[] = [];
let itensCache: unknown[] = [];
let estadoAtual: CadastrosEstado | null = null;
let editandoUsuarioId: number | null = null;
let ajustandoEquipamentoId: number | null = null;
let editandoCategoriaId: number | null = null;
let editandoResponsavelId: number | null = null;
/** Double-submit guard: keys of operations currently running. */
const emAndamento = new Set<string>();

async function executarUnico(chave: string, fn: () => Promise<void>): Promise<void> {
    if (emAndamento.has(chave)) return;
    emAndamento.add(chave);
    try {
        await fn();
    } finally {
        emAndamento.delete(chave);
    }
}

const CAMPOS_EDICAO_USUARIO = ['edit-usuario-nome', 'edit-usuario-login'];
let usuarioRfidAtual: Usuario | null = null;
let usuarioResetSenhaAtual: Usuario | null = null;

export function attachCadastrosEvents(els: CadastrosEls, estado: CadastrosEstado): void {
    estadoAtual = estado;

    els.busca?.addEventListener('input', () => renderizarLista(els));
    aoTrocarSessao(() => {
        if (!els.busca?.value) return;
        els.busca.value = '';
        if (estadoAtual?.tipoAtual) renderizarLista(els);
    });

    // Clears a field's inline error as soon as the user edits it.
    const limparErroAoDigitar = (e: Event) => {
        const alvo = e.target as HTMLElement | null;
        if (alvo?.getAttribute('aria-invalid') === 'true' && alvo.id) mostrarErroCampo(alvo.id, null);
    };
    els.camposWrap.addEventListener('input', limparErroAoDigitar);
    els.listaWrap.addEventListener('input', limparErroAoDigitar);

    els.cards.forEach((card) => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            if (bloquearSeNaoAdmin('Cadastros disponível apenas para administradores.')) return;
            abrirCadastro(els, estado, card.dataset.cadastro ?? null);
        });
    });

    if (els.btnCancelar) {
        els.btnCancelar.addEventListener('click', () => closeModal('modal-cadastro'));
    }

    if (els.btnSalvar) {
        els.btnSalvar.addEventListener('click', () => salvarRegistro(els, estado));
    }

    els.listaWrap.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        if (target.closest('[data-limpar-busca]')) {
            if (els.busca) { els.busca.value = ''; els.busca.focus(); }
            renderizarLista(els);
            return;
        }

        if (tratarCliqueAcaoLista(els, estado, target)) return;

        const botaoReset = target.closest<HTMLElement>('[data-reset-senha-usuario-id]');
        if (botaoReset) {
            if (bloquearSeNaoAdmin()) return;
            const usuario = usuariosCache.find((u) => String(u.id) === botaoReset.dataset.resetSenhaUsuarioId);
            if (!usuario) return;
            if (usuario.id === getUsuario()?.id) {
                // Resetting your own password would revoke your current session; use the authenticated flow.
                showToast(t('feedback.redefinir_propria_senha'), 'warning');
                return;
            }
            usuarioResetSenhaAtual = usuario;
            abrirModalResetSenha(els.resetSenhaModal, usuario);
            return;
        }

        const chip = target.closest<HTMLElement>('[data-rfid-usuario-id]');
        if (!chip) return;
        if (bloquearSeNaoAdmin()) return;

        const usuario = usuariosCache.find((u) => String(u.id) === chip.dataset.rfidUsuarioId);
        if (!usuario) return;

        usuarioRfidAtual = usuario;
        abrirModalRfid(els.rfidModal, usuario);
    });

    els.listaWrap.addEventListener('submit', (e) => {
        const form = e.target as HTMLFormElement;
        if (form.matches('[data-editar-usuario-form]')) {
            e.preventDefault();
            void salvarEdicaoUsuario(els, estado, form);
        } else if (form.matches('[data-ajustar-total-form]')) {
            e.preventDefault();
            void salvarAjusteTotal(els, estado, form);
        } else if (form.matches('[data-renomear-categoria-form]')) {
            e.preventDefault();
            void salvarRenomearCategoria(els, estado, form);
        } else if (form.matches('[data-editar-responsavel-form]')) {
            e.preventDefault();
            void salvarEdicaoResponsavel(els, estado, form);
        }
    });

    attachRfidModalEvents(els);
    attachResetSenhaModalEvents(els);
}

function attachResetSenhaModalEvents(els: CadastrosEls): void {
    const modal = els.resetSenhaModal;
    if (!modal.form) return;

    modal.btnCancelar.addEventListener('click', () => {
        usuarioResetSenhaAtual = null;
        fecharModalResetSenha(modal);
    });

    modal.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (bloquearSeNaoAdmin() || !usuarioResetSenhaAtual) return;

        const erroValidacao = validarNovaSenha(modal.novaSenha.value, modal.confirmarSenha.value);
        if (erroValidacao) {
            showToast(t(erroValidacao), 'warning');
            return;
        }

        const usuario = usuarioResetSenhaAtual;
        setButtonLoading(modal.btnSalvar, true);
        try {
            await redefinirSenhaUsuario(usuario.id, modal.novaSenha.value);
            usuarioResetSenhaAtual = null;
            fecharModalResetSenha(modal);
            showToast(t('feedback.senha_redefinida').replace('{nome}', usuario.nome), 'success');
        } catch (erro) {
            showToast(traduzirErro(erro, 'feedback.erro_redefinir_senha'), 'error');
        } finally {
            setButtonLoading(modal.btnSalvar, false);
        }
    });
}

function attachRfidModalEvents(els: CadastrosEls): void {
    const { rfidModal } = els;

    rfidModal.btnFechar.addEventListener('click', () => fecharModalRfid());

    rfidModal.btnGerar.addEventListener('click', () => gerarOuRegerarToken(els, rfidModal.btnGerar));
    rfidModal.btnRegerar.addEventListener('click', () => gerarOuRegerarToken(els, rfidModal.btnRegerar));

    rfidModal.btnCopiar.addEventListener('click', async () => {
        const valor = rfidModal.tokenValor.textContent ?? '';
        try {
            await navigator.clipboard.writeText(valor);
            showToast('Token copiado.', 'success');
        } catch {
            showToast(t('feedback.erro_copiar_token_manual'), 'warning');
        }
    });

    rfidModal.btnRevogar.addEventListener('click', async () => {
        if (bloquearSeNaoAdmin() || !usuarioRfidAtual) return;

        const confirmado = await confirmarExclusao({
            titulo: 'Revogar cartão RFID',
            mensagem: 'O cartão físico deixará de permitir login automático para este usuário.',
            textoAtencao: 'Esta ação não pode ser desfeita — será necessário gerar um novo token e regravar o cartão.'
        });
        if (!confirmado) return;

        rfidModal.btnRevogar.disabled = true;
        try {
            await revogarCartaoRfid(usuarioRfidAtual.id);
            exibirCartaoRevogado(rfidModal);
            atualizarUsuarioLocal(els, { ...usuarioRfidAtual, possuiCartaoRfid: false });
            showToast('Cartão revogado com sucesso.', 'success');
        } catch (erro) {
            showToast(traduzirErro(erro, 'feedback.erro_revogar_cartao'), 'error');
        } finally {
            rfidModal.btnRevogar.disabled = false;
        }
    });
}

async function gerarOuRegerarToken(els: CadastrosEls, botaoClicado: HTMLButtonElement): Promise<void> {
    const { rfidModal } = els;
    if (bloquearSeNaoAdmin() || !usuarioRfidAtual) return;

    const textoOriginal = botaoClicado.innerHTML;
    rfidModal.btnGerar.disabled = true;
    rfidModal.btnRegerar.disabled = true;
    botaoClicado.innerHTML = '<span class="material-symbols-outlined">progress_activity</span> Iniciando hardware...';

    try {
        await gerarCartaoRfid(usuarioRfidAtual.id);
        exibirModoGravacao(rfidModal);
        atualizarUsuarioLocal(els, { ...usuarioRfidAtual, possuiCartaoRfid: true });
        showToast('Leitor pronto para gravar.', 'success');
    } catch (erro) {
        showToast(traduzirErro(erro, 'feedback.erro_gerar_token'), 'error');
    } finally {
        rfidModal.btnGerar.disabled = false;
        rfidModal.btnRegerar.disabled = false;
        botaoClicado.innerHTML = textoOriginal;
    }
}

function atualizarUsuarioLocal(els: CadastrosEls, usuarioAtualizado: Usuario): void {
    usuarioRfidAtual = usuarioAtualizado;
    usuariosCache = usuariosCache.map((u) => (u.id === usuarioAtualizado.id ? usuarioAtualizado : u));
    itensCache = usuariosCache;
    renderizarLista(els);
}

async function abrirCadastro(els: CadastrosEls, estado: CadastrosEstado, tipo: string | null): Promise<void> {
    const config = getConfig(tipo);
    if (!config) return;

    estado.tipoAtual = tipo;
    itensCache = [];
    usuariosCache = [];
    editandoUsuarioId = null;
    ajustandoEquipamentoId = null;
    editandoCategoriaId = null;
    editandoResponsavelId = null;
    if (els.busca) els.busca.value = '';

    let camposComOpcoes: CampoComOpcoes[];
    try {
        camposComOpcoes = await Promise.all(
            config.campos.map(async (campo) => ({ campo, opcoes: await carregarOpcoesCampo(campo) }))
        );
    } catch {
        showToast(t('feedback.erro_carregar_formulario'), 'error');
        return;
    }

    abrirModalCadastro(els, config, camposComOpcoes);
    await recarregarLista(els, estado);
}

async function recarregarLista(els: CadastrosEls, estado: CadastrosEstado): Promise<void> {
    const tipo = estado.tipoAtual;
    exibirListaCarregando(els);

    try {
        const itens = await listarRegistros(tipo);
        // The user switched to another cadastro while this request was in flight: discard the stale response.
        if (estado.tipoAtual !== tipo) return;

        itensCache = itens;
        if (tipo === 'usuarios') usuariosCache = itens as Usuario[];
        renderizarLista(els);
    } catch (erro) {
        if (estado.tipoAtual !== tipo) return;
        exibirListaErro(els);
        showToast(traduzirErro(erro, 'cadastros.erro_carregar_registros'), 'error');
    }
}

async function salvarRegistro(els: CadastrosEls, estado: CadastrosEstado): Promise<void> {
    if (bloquearSeNaoAdmin()) return;
    const config = getConfig(estado.tipoAtual);
    if (!config) return;

    const valores: Record<string, string> = {};
    config.campos.forEach((campo) => {
        const el = document.getElementById(campo.id) as HTMLInputElement | HTMLSelectElement | null;
        valores[campo.id] = el ? el.value.trim() : '';
    });

    const erros = validarCamposCadastro(config.campos, valores);
    if (!erros['cad-senha-usuario'] && estado.tipoAtual === 'usuarios') {
        const erroSenha = validarSenhaNovoUsuario(valores['cad-senha-usuario'] ?? '');
        if (erroSenha) erros['cad-senha-usuario'] = erroSenha;
    }
    aplicarErrosCampos(config.campos.map((campo) => campo.id), erros);
    if (Object.keys(erros).length) return;

    await executarUnico('criar-registro', () => criarEAtualizar(els, estado, config.campos, valores));
}

async function criarEAtualizar(
    els: CadastrosEls,
    estado: CadastrosEstado,
    campos: CampoCadastro[],
    valores: Record<string, string>
): Promise<void> {
    if (els.btnSalvar) setButtonLoading(els.btnSalvar, true);
    try {
        await criarRegistro(estado.tipoAtual, valores);
        if (estado.tipoAtual === 'equipamentos' || estado.tipoAtual === 'categorias') await carregarEquipamentos();
        if (estado.tipoAtual === 'responsaveis') await carregarResponsaveis();
        showToast('Registro criado com sucesso', 'success');
        limparCamposFormulario(campos);
        await recarregarLista(els, estado);
    } catch (erro) {
        showToast(traduzirErro(erro, 'feedback.erro_salvar_registro'), 'error');
    } finally {
        if (els.btnSalvar) setButtonLoading(els.btnSalvar, false);
    }
}


/* ===== Lista: filtro, edição de usuários e ajuste de total ===== */

function renderizarLista(els: CadastrosEls): void {
    const tipo = estadoAtual?.tipoAtual ?? null;
    const termo = els.busca?.value ?? '';

    if (tipo === 'usuarios') {
        renderListaUsuarios(els, filtrarPorBusca(usuariosCache, termo, textoBuscaUsuario), {
            usuarioAtualId: getUsuario()?.id ?? null,
            editandoId: editandoUsuarioId
        }, termo);
    } else if (tipo === 'equipamentos') {
        renderListaEquipamentos(els, filtrarPorBusca(itensCache as Equipamento[], termo, textoEquipamento), {
            ajustandoId: ajustandoEquipamentoId
        }, termo);
    } else if (tipo === 'categorias') {
        renderListaCategorias(els, filtrarPorBusca(itensCache as Categoria[], termo, textoCategoria), editandoCategoriaId, termo);
    } else if (tipo === 'responsaveis') {
        renderListaResponsaveis(els, filtrarPorBusca(itensCache as Responsavel[], termo, textoResponsavel), editandoResponsavelId, termo);
    } else {
        const pares = itensCache.map((item) => ({ texto: formatarItem(tipo, item), item: item as ItemComAutoria }));
        const filtrados = filtrarPorBusca(pares, termo, (par) => par.texto);
        renderListaRegistros(els, filtrados.map((par) => par.texto), filtrados.map((par) => par.item), termo);
    }
}

/** Handles the edit/deactivate/reactivate/adjust buttons. Returns true when the click was consumed. */
function tratarCliqueAcaoLista(els: CadastrosEls, estado: CadastrosEstado, target: HTMLElement): boolean {
    const editar = target.closest<HTMLElement>('[data-editar-usuario-id]');
    if (editar) {
        if (bloquearSeNaoAdmin()) return true;
        editandoUsuarioId = Number(editar.dataset.editarUsuarioId);
        renderizarLista(els);
        els.listaWrap.querySelector<HTMLInputElement>('#edit-usuario-nome')?.focus();
        return true;
    }
    if (target.closest('[data-editar-usuario-cancelar]')) {
        editandoUsuarioId = null;
        renderizarLista(els);
        return true;
    }

    const desativar = target.closest<HTMLButtonElement>('[data-desativar-usuario-id]');
    const reativar = target.closest<HTMLButtonElement>('[data-reativar-usuario-id]');
    if (desativar || reativar) {
        if (bloquearSeNaoAdmin()) return true;
        const botao = (desativar ?? reativar) as HTMLButtonElement;
        const id = Number(desativar ? desativar.dataset.desativarUsuarioId : reativar?.dataset.reativarUsuarioId);
        const usuario = usuariosCache.find((u) => u.id === id);
        if (usuario) void alternarAtivoUsuario(els, estado, usuario, botao, !desativar);
        return true;
    }

    const renomear = target.closest<HTMLElement>('[data-renomear-categoria-id]');
    if (renomear) {
        if (bloquearSeNaoAdmin()) return true;
        editandoCategoriaId = Number(renomear.dataset.renomearCategoriaId);
        renderizarLista(els);
        els.listaWrap.querySelector<HTMLInputElement>('#edit-categoria-nome')?.focus();
        return true;
    }
    if (target.closest('[data-renomear-categoria-cancelar]')) {
        editandoCategoriaId = null;
        renderizarLista(els);
        return true;
    }

    const editarResp = target.closest<HTMLElement>('[data-editar-responsavel-id]');
    if (editarResp) {
        if (bloquearSeNaoAdmin()) return true;
        editandoResponsavelId = Number(editarResp.dataset.editarResponsavelId);
        renderizarLista(els);
        els.listaWrap.querySelector<HTMLInputElement>('#edit-responsavel-nome')?.focus();
        return true;
    }
    if (target.closest('[data-editar-responsavel-cancelar]')) {
        editandoResponsavelId = null;
        renderizarLista(els);
        return true;
    }
    const desativarResp = target.closest<HTMLButtonElement>('[data-desativar-responsavel-id]');
    const reativarResp = target.closest<HTMLButtonElement>('[data-reativar-responsavel-id]');
    if (desativarResp || reativarResp) {
        if (bloquearSeNaoAdmin()) return true;
        const botao = (desativarResp ?? reativarResp) as HTMLButtonElement;
        const id = Number(desativarResp ? desativarResp.dataset.desativarResponsavelId : reativarResp?.dataset.reativarResponsavelId);
        const responsavel = (itensCache as Responsavel[]).find((r) => r.id === id);
        if (responsavel) void alternarAtivoResponsavel(els, estado, responsavel, botao, !desativarResp);
        return true;
    }

    const ajustar = target.closest<HTMLElement>('[data-ajustar-total-id]');
    if (ajustar) {
        if (bloquearSeNaoAdmin()) return true;
        ajustandoEquipamentoId = Number(ajustar.dataset.ajustarTotalId);
        renderizarLista(els);
        els.listaWrap.querySelector<HTMLInputElement>('#ajuste-total-valor')?.focus();
        return true;
    }
    if (target.closest('[data-ajustar-total-cancelar]')) {
        ajustandoEquipamentoId = null;
        renderizarLista(els);
        return true;
    }
    return false;
}

async function alternarAtivoUsuario(
    els: CadastrosEls,
    estado: CadastrosEstado,
    usuario: Usuario,
    botao: HTMLButtonElement,
    ativar: boolean
): Promise<void> {
    await executarUnico(`ativo-${usuario.id}`, async () => {
        const confirmado = await confirmarExclusao({
            titulo: t(ativar ? 'cadastros.reativar_titulo' : 'cadastros.desativar_titulo'),
            mensagem: t(ativar ? 'cadastros.reativar_mensagem' : 'cadastros.desativar_mensagem').replace('{nome}', usuario.nome),
            textoAtencao: ativar ? undefined : t('cadastros.desativar_aviso'),
            chaveConfirmar: ativar ? 'cadastros.reativar' : 'cadastros.desativar',
            iconeConfirmar: ativar ? 'person_check' : 'person_off'
        });
        if (!confirmado) return;

        setButtonLoading(botao, true);
        try {
            await atualizarUsuario(usuario.id, { ativo: ativar });
            showToast(t(ativar ? 'feedback.usuario_reativado' : 'feedback.usuario_desativado').replace('{nome}', usuario.nome), 'success');
            await recarregarLista(els, estado);
        } catch (erro) {
            showToast(traduzirErro(erro, 'feedback.erro_atualizar_usuario'), 'error');
        } finally {
            setButtonLoading(botao, false);
        }
    });
}

async function salvarEdicaoUsuario(els: CadastrosEls, estado: CadastrosEstado, form: HTMLFormElement): Promise<void> {
    if (bloquearSeNaoAdmin()) return;
    const usuario = usuariosCache.find((u) => String(u.id) === form.dataset.editarUsuarioForm);
    if (!usuario) return;

    const valor = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '';
    const valores = { nome: valor('edit-usuario-nome'), login: valor('edit-usuario-login'), nivelAcesso: valor('edit-usuario-nivel') || usuario.nivelAcesso };

    const erros = validarEdicaoUsuario(usuario, valores);
    aplicarErrosCampos(CAMPOS_EDICAO_USUARIO, erros);
    if (Object.keys(erros).length) return;

    const payload = montarPayloadAtualizacaoUsuario(usuario, valores);
    if (!Object.keys(payload).length) {
        editandoUsuarioId = null;
        renderizarLista(els);
        return;
    }

    await executarUnico(`editar-usuario-${usuario.id}`, async () => {
        const botao = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        setButtonLoading(botao, true);
        try {
            await atualizarUsuario(usuario.id, payload);
            editandoUsuarioId = null;
            showToast(t('feedback.usuario_atualizado'), 'success');
            await recarregarLista(els, estado);
        } catch (erro) {
            showToast(traduzirErro(erro, 'feedback.erro_atualizar_usuario'), 'error');
        } finally {
            setButtonLoading(botao, false);
        }
    });
}

async function salvarAjusteTotal(els: CadastrosEls, estado: CadastrosEstado, form: HTMLFormElement): Promise<void> {
    if (bloquearSeNaoAdmin()) return;
    const id = Number(form.dataset.ajustarTotalForm);
    const equipamento = (itensCache as Equipamento[]).find((e) => e.id === id) ?? getEquipamentos().find((e) => e.id === id);
    if (!equipamento) return;

    const campo = 'ajuste-total-valor';
    const entrada = (document.getElementById(campo) as HTMLInputElement | null)?.value.trim() ?? '';
    const resultado = montarPayloadAjusteTotal(equipamento, /^\d+$/.test(entrada) ? Number(entrada) : NaN);
    if (!resultado.ok) {
        mostrarErroCampo(campo, resultado.erro);
        if (resultado.emUso !== undefined) {
            const erroEl = document.getElementById(`${campo}-erro`);
            if (erroEl) erroEl.textContent = t(resultado.erro).replace('{emUso}', String(resultado.emUso));
        }
        document.getElementById(campo)?.focus();
        return;
    }
    mostrarErroCampo(campo, null);
    if (resultado.payload.quantidadeTotal === equipamento.quantidadeTotal) {
        ajustandoEquipamentoId = null;
        renderizarLista(els);
        return;
    }

    await executarUnico(`ajustar-total-${id}`, async () => {
        const botao = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        setButtonLoading(botao, true);
        try {
            await ajustarTotalEquipamento(id, resultado.payload);
            ajustandoEquipamentoId = null;
            showToast(t('feedback.total_ajustado'), 'success');
            await recarregarLista(els, estado);
        } catch (erro) {
            showToast(traduzirErro(erro, 'feedback.erro_ajustar_total'), 'error');
        } finally {
            setButtonLoading(botao, false);
        }
    });
}


async function salvarRenomearCategoria(els: CadastrosEls, estado: CadastrosEstado, form: HTMLFormElement): Promise<void> {
    if (bloquearSeNaoAdmin()) return;
    const id = Number(form.dataset.renomearCategoriaForm);
    const categoria = (itensCache as Categoria[]).find((c) => c.id === id);
    if (!categoria) return;

    const campo = 'edit-categoria-nome';
    const entrada = (document.getElementById(campo) as HTMLInputElement | null)?.value ?? '';
    const erro = validarRenomearCategoria(categoria.nome, entrada);
    mostrarErroCampo(campo, erro);
    if (erro) {
        document.getElementById(campo)?.focus();
        return;
    }
    const novoNome = nomeCategoriaAlterado(categoria.nome, entrada);
    if (!novoNome) {
        editandoCategoriaId = null;
        renderizarLista(els);
        return;
    }

    await executarUnico(`renomear-categoria-${id}`, async () => {
        const botao = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        setButtonLoading(botao, true);
        try {
            await renomearCategoria(id, novoNome);
            editandoCategoriaId = null;
            await carregarEquipamentos().catch(() => undefined);
            showToast(t('feedback.categoria_renomeada'), 'success');
            await recarregarLista(els, estado);
        } catch (erroApi) {
            // Inline: duplicate name / not found appear under the field so the admin can fix it in place.
            mostrarErroCampoTexto(campo, traduzirErro(erroApi, 'feedback.erro_renomear_categoria'));
        } finally {
            setButtonLoading(botao, false);
        }
    });
}

function mostrarErroCampoTexto(id: string, mensagem: string): void {
    document.getElementById(id)?.setAttribute('aria-invalid', 'true');
    const erroEl = document.getElementById(`${id}-erro`);
    if (erroEl) {
        erroEl.textContent = mensagem;
        erroEl.hidden = false;
    }
}

async function salvarEdicaoResponsavel(els: CadastrosEls, estado: CadastrosEstado, form: HTMLFormElement): Promise<void> {
    if (bloquearSeNaoAdmin()) return;
    const id = Number(form.dataset.editarResponsavelForm);
    const responsavel = (itensCache as Responsavel[]).find((r) => r.id === id);
    if (!responsavel) return;

    const valor = (campo: string) => (document.getElementById(campo) as HTMLInputElement | null)?.value ?? '';
    const valores = { nome: valor('edit-responsavel-nome'), cargo: valor('edit-responsavel-cargo') };
    const erros = validarEdicaoResponsavel(valores);
    aplicarErrosCampos(['edit-responsavel-nome', 'edit-responsavel-cargo'], erros);
    if (Object.keys(erros).length) return;

    const payload = montarPayloadAtualizacaoResponsavel(responsavel, valores);
    if (!Object.keys(payload).length) {
        editandoResponsavelId = null;
        renderizarLista(els);
        return;
    }

    await executarUnico(`editar-responsavel-${id}`, async () => {
        const botao = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        setButtonLoading(botao, true);
        try {
            await atualizarResponsavel(id, payload);
            editandoResponsavelId = null;
            await carregarResponsaveis().catch(() => undefined);
            showToast(t('feedback.responsavel_atualizado'), 'success');
            await recarregarLista(els, estado);
        } catch (erro) {
            mostrarErroCampoTexto('edit-responsavel-nome', traduzirErro(erro, 'feedback.erro_atualizar_responsavel'));
        } finally {
            setButtonLoading(botao, false);
        }
    });
}

async function alternarAtivoResponsavel(
    els: CadastrosEls,
    estado: CadastrosEstado,
    responsavel: Responsavel,
    botao: HTMLButtonElement,
    ativar: boolean
): Promise<void> {
    await executarUnico(`ativo-responsavel-${responsavel.id}`, async () => {
        const confirmado = await confirmarExclusao({
            titulo: t(ativar ? 'cadastros.reativar_responsavel_titulo' : 'cadastros.desativar_responsavel_titulo'),
            mensagem: t(ativar ? 'cadastros.reativar_responsavel_mensagem' : 'cadastros.desativar_responsavel_mensagem').replace('{nome}', responsavel.nome),
            textoAtencao: ativar ? undefined : t('cadastros.desativar_responsavel_aviso'),
            chaveConfirmar: ativar ? 'cadastros.reativar' : 'cadastros.desativar',
            iconeConfirmar: ativar ? 'person_check' : 'person_off'
        });
        if (!confirmado) return;

        setButtonLoading(botao, true);
        try {
            await atualizarResponsavel(responsavel.id, { ativo: ativar });
            // Shared store (loan form select) uses the default active-only list, so the person appears/disappears there.
            await carregarResponsaveis().catch(() => undefined);
            showToast(t(ativar ? 'feedback.responsavel_reativado' : 'feedback.responsavel_desativado').replace('{nome}', responsavel.nome), 'success');
            await recarregarLista(els, estado);
        } catch (erro) {
            showToast(traduzirErro(erro, 'feedback.erro_atualizar_responsavel'), 'error');
        } finally {
            setButtonLoading(botao, false);
        }
    });
}
