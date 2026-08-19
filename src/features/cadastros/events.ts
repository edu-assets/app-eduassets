import { closeModal, showToast, confirmarExclusao } from '../../core/ui/index.js';
import { getConfig, listarRegistros, criarRegistro, carregarOpcoesCampo, formatarItem, gerarCartaoRfid, revogarCartaoRfid } from './service.js';
import {
    abrirModalCadastro,
    exibirListaCarregando,
    exibirListaErro,
    renderListaRegistros,
    renderListaUsuarios,
    limparCamposFormulario,
    abrirModalRfid,
    exibirModoGravacao, // AQUI: Atualizado a importação[cite: 22]
    exibirCartaoRevogado,
    fecharModalRfid
} from './render.js';
import { bloquearSeNaoAdmin } from '../../core/auth/guestGate.js';
import type { CampoComOpcoes, RfidModalEls } from './render.js';
import type { Usuario } from '../../types/index.js';

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
    rfidModal: RfidModalEls;
}

export interface CadastrosEstado {
    tipoAtual: string | null;
}

let usuariosCache: Usuario[] = [];
let usuarioRfidAtual: Usuario | null = null;

export function attachCadastrosEvents(els: CadastrosEls, estado: CadastrosEstado): void {
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
        const chip = target.closest<HTMLElement>('[data-rfid-usuario-id]');
        if (!chip) return;
        if (bloquearSeNaoAdmin()) return;

        const usuario = usuariosCache.find((u) => String(u.id) === chip.dataset.rfidUsuarioId);
        if (!usuario) return;

        usuarioRfidAtual = usuario;
        abrirModalRfid(els.rfidModal, usuario);
    });

    attachRfidModalEvents(els);
}

function attachRfidModalEvents(els: CadastrosEls): void {
    const { rfidModal } = els;

    rfidModal.btnFechar.addEventListener('click', () => fecharModalRfid());

    rfidModal.btnGerar.addEventListener('click', () => gerarOuRegerarToken(els));
    rfidModal.btnRegerar.addEventListener('click', () => gerarOuRegerarToken(els));

    // Ação do btnCopiar mantida para retrocompatibilidade técnica, mesmo ficando oculto na visualização[cite: 22]
    rfidModal.btnCopiar.addEventListener('click', async () => {
        const valor = rfidModal.tokenValor.textContent ?? '';
        try {
            await navigator.clipboard.writeText(valor);
            showToast('Token copiado.', 'success');
        } catch {
            showToast('Não foi possível copiar automaticamente. Selecione e copie manualmente.', 'warning');
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
            showToast(erro instanceof Error ? erro.message : 'Erro ao revogar cartão.', 'error');
        } finally {
            rfidModal.btnRevogar.disabled = false;
        }
    });
}

// AQUI: Lógica atualizada para invocar a gravação via API e lidar com falhas de hardware[cite: 22]
async function gerarOuRegerarToken(els: CadastrosEls): Promise<void> {
    const { rfidModal } = els;
    if (bloquearSeNaoAdmin() || !usuarioRfidAtual) return;

    rfidModal.btnGerar.disabled = true;
    rfidModal.btnRegerar.disabled = true;
    
    // Status de feedback visual provisório (UX)
    const textoOriginal = rfidModal.btnGerar.textContent;
    rfidModal.btnGerar.textContent = 'Iniciando Hardware...';
    
    try {
        await gerarCartaoRfid(usuarioRfidAtual.id);
        
        // Exibe o painel de animação para encostar o cartão[cite: 22]
        exibirModoGravacao(rfidModal);
        atualizarUsuarioLocal(els, { ...usuarioRfidAtual, possuiCartaoRfid: true });
        
        showToast('Leitor pronto para gravar.', 'success');
    } catch (erro) {
        // Se a Promise no service capturar o erro 502/503 e rejeitar, ele vai extrair e disparar a mensagem de "Hardware indisponível"[cite: 22]
        const mensagemErro = erro instanceof Error ? erro.message : 'Erro ao gerar token.';
        showToast(mensagemErro, 'error');
    } finally {
        rfidModal.btnGerar.disabled = false;
        rfidModal.btnRegerar.disabled = false;
        rfidModal.btnGerar.textContent = textoOriginal;
    }
}

/** Mantém a lista por trás do modal sincronizada em tempo real com o estado do cartão. */
function atualizarUsuarioLocal(els: CadastrosEls, usuarioAtualizado: Usuario): void {
    usuarioRfidAtual = usuarioAtualizado;
    usuariosCache = usuariosCache.map((u) => (u.id === usuarioAtualizado.id ? usuarioAtualizado : u));
    renderListaUsuarios(els, usuariosCache);
}

async function abrirCadastro(els: CadastrosEls, estado: CadastrosEstado, tipo: string | null): Promise<void> {
    const config = getConfig(tipo);
    if (!config) return;

    estado.tipoAtual = tipo;

    let camposComOpcoes: CampoComOpcoes[];
    try {
        camposComOpcoes = await Promise.all(
            config.campos.map(async (campo) => ({ campo, opcoes: await carregarOpcoesCampo(campo) }))
        );
    } catch {
        showToast('Não foi possível carregar os dados do formulário.', 'error');
        return;
    }

    abrirModalCadastro(els, config, camposComOpcoes);
    await recarregarLista(els, estado);
}

async function recarregarLista(els: CadastrosEls, estado: CadastrosEstado): Promise<void> {
    exibirListaCarregando(els);

    try {
        const itens = await listarRegistros(estado.tipoAtual);

        if (estado.tipoAtual === 'usuarios') {
            usuariosCache = itens as Usuario[];
            renderListaUsuarios(els, usuariosCache);
        } else {
            renderListaRegistros(els, itens.map((item) => formatarItem(estado.tipoAtual, item)));
        }
    } catch (erro) {
        exibirListaErro(els);
        showToast(erro instanceof Error ? erro.message : 'Erro ao carregar registros.', 'error');
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

    const temCampoVazio = config.campos.some((campo) => !valores[campo.id]);
    if (temCampoVazio) {
        showToast('Preencha todos os campos antes de salvar.', 'warning');
        return;
    }

    if (els.btnSalvar) els.btnSalvar.disabled = true;
    try {
        await criarRegistro(estado.tipoAtual, valores);
        showToast('Registro criado com sucesso', 'success');
        limparCamposFormulario(config.campos);
        await recarregarLista(els, estado);
    } catch (erro) {
        showToast(erro instanceof Error ? erro.message : 'Erro ao salvar registro.', 'error');
    } finally {
        if (els.btnSalvar) els.btnSalvar.disabled = false;
    }
}