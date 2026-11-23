import { openModal, closeModal } from './modal.js';
import { t, traduzirTexto } from '../state/i18nStore.js';

const ID_MODAL = 'modal-confirmar-exclusao';

export type VarianteConfirmacao = 'info' | 'warning' | 'error';

/** Campos próprios dentro do modal (ex.: data e hora de um agendamento). */
export interface ConteudoConfirmacao<T = never> {
    /** Marcação dos campos. Valores dinâmicos devem passar por `html` (escapados). */
    html: string;
    /** Chamado depois de o HTML ser inserido (ligar pickers/eventos). Pode devolver uma função de limpeza. */
    aoAbrir?: (container: HTMLElement) => void | (() => void);
    /** Chamado ao confirmar; devolva false para manter o modal aberto (a validação mostra seus próprios erros). */
    validar?: (container: HTMLElement) => boolean;
    /** Valores devolvidos pela Promise ao confirmar (lidos antes de o modal fechar). */
    coletar?: (container: HTMLElement) => T;
}

export interface ConfirmarAcaoOpcoes<T = never> {
    /** Texto em português ou chave i18n. */
    titulo: string;
    mensagem: string;
    /** HTML dos detalhes (já escapado pelo chamador). */
    detalhesHtml?: string;
    /** Chave i18n do botão de confirmar. */
    rotuloConfirmar: string;
    /** Chave i18n do botão de cancelar (padrão: 'shell.cancelar'). */
    rotuloCancelar?: string;
    variante: VarianteConfirmacao;
    /** Nome do ícone Material Symbols (cabeçalho e botão de confirmar). */
    icone: string;
    /** Frase de atenção em destaque (callout) abaixo dos detalhes. */
    textoAtencao?: string;
    conteudo?: ConteudoConfirmacao<T>;
}

interface ConfirmarExclusaoOpcoes {
    titulo?: string;
    mensagem?: string;
    detalhesHtml?: string;
    textoAtencao?: string;
    /** i18n key of the confirm button label (default: 'shell.excluir_registro'). */
    chaveConfirmar?: string;
    /** Material Symbols icon name for the confirm button (default: 'delete'). */
    iconeConfirmar?: string;
}

interface ConfirmacaoAtual {
    conteudo: ConteudoConfirmacao<unknown> | undefined;
    limpeza: (() => void) | undefined;
    resolver: (valor: unknown) => void;
    removerEscape: () => void;
}

let atual: ConfirmacaoAtual | null = null;

const CLASSES_ICONE = ['modal-header-icon-error', 'modal-header-icon-warning', 'modal-header-icon-info'];
const CLASSES_BOTAO = ['btn-danger', 'btn-warning', 'btn-primary'];
const CLASSES_CALLOUT = ['modal-callout-error', 'modal-callout-warning', 'modal-callout-info'];
const POR_VARIANTE: Record<VarianteConfirmacao, { icone: string; botao: string; callout: string }> = {
    error: { icone: 'modal-header-icon-error', botao: 'btn-danger', callout: 'modal-callout-error' },
    warning: { icone: 'modal-header-icon-warning', botao: 'btn-warning', callout: 'modal-callout-warning' },
    info: { icone: 'modal-header-icon-info', botao: 'btn-primary', callout: 'modal-callout-info' }
};

function conteudoEl(): HTMLElement | null {
    return document.getElementById('confirmar-exclusao-conteudo');
}

/** Fecha o modal e resolve a Promise pendente (confirmado + valores coletados quando houver `coletar`). */
function finalizar(confirmado: boolean): void {
    const pendente = atual;
    if (!pendente) {
        closeModal(ID_MODAL);
        return;
    }
    const container = conteudoEl();
    const { conteudo } = pendente;
    let valor: unknown = confirmado;
    if (confirmado && conteudo && container) {
        if (conteudo.validar && !conteudo.validar(container)) return;
        if (conteudo.coletar) valor = conteudo.coletar(container);
    } else if (conteudo?.coletar) {
        valor = null;
    }
    atual = null;
    pendente.removerEscape();
    pendente.limpeza?.();
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }
    closeModal(ID_MODAL);
    pendente.resolver(valor);
}

export function initConfirm(): void {
    const overlay = document.getElementById(ID_MODAL);
    if (!overlay) return;

    const btnConfirmar = document.getElementById('confirmar-exclusao-btn');
    const btnCancelar = document.getElementById('confirmar-exclusao-cancelar');

    btnConfirmar?.addEventListener('click', () => finalizar(true));
    btnCancelar?.addEventListener('click', () => finalizar(false));

    overlay.addEventListener('click', (e) => {
        const alvo = e.target as HTMLElement | null;
        // Clique no fundo ou no "X" do cabeçalho (inserido por initModals): cancela e resolve a Promise.
        if (alvo === overlay || alvo?.closest('.modal-close-btn')) finalizar(false);
    });
}

function trocarClasse(el: HTMLElement | null, todas: string[], escolhida: string): void {
    if (!el) return;
    el.classList.remove(...todas);
    el.classList.add(escolhida);
}

export function confirmarAcao(opcoes: ConfirmarAcaoOpcoes<never> & { conteudo?: ConteudoConfirmacao<never> }): Promise<boolean>;
export function confirmarAcao<T>(opcoes: ConfirmarAcaoOpcoes<T> & { conteudo: ConteudoConfirmacao<T> & { coletar: (container: HTMLElement) => T } }): Promise<T | null>;
/**
 * Modal de confirmação genérico. Sem `conteudo.coletar` resolve `true` (confirmou) ou `false` (cancelou, Esc, fundo ou
 * "X"). Com `conteudo.coletar` resolve os valores coletados ou `null` ao cancelar.
 */
export function confirmarAcao<T>(opcoes: ConfirmarAcaoOpcoes<T>): Promise<boolean | T | null> {
    const overlay = document.getElementById(ID_MODAL);
    const titulo = traduzirTexto(opcoes.titulo);
    const mensagem = traduzirTexto(opcoes.mensagem);
    const textoAtencao = opcoes.textoAtencao ? traduzirTexto(opcoes.textoAtencao) : undefined;
    if (!overlay) return Promise.resolve(opcoes.conteudo?.coletar ? null : window.confirm(mensagem));

    // Uma confirmação nova cancela a anterior que ficou pendente.
    if (atual) finalizar(false);

    const variante = POR_VARIANTE[opcoes.variante];
    const tituloEl = document.getElementById('confirmar-exclusao-titulo');
    const mensagemEl = document.getElementById('confirmar-exclusao-mensagem');
    const detalhesEl = document.getElementById('confirmar-exclusao-detalhes');
    const calloutEl = document.getElementById('confirmar-exclusao-callout');
    const calloutText = document.getElementById('confirmar-exclusao-callout-text');
    const iconeEl = document.getElementById('confirmar-exclusao-icone');
    const btnConfirmar = document.getElementById('confirmar-exclusao-btn') as HTMLButtonElement | null;
    const btnCancelar = document.getElementById('confirmar-exclusao-cancelar') as HTMLButtonElement | null;
    const container = conteudoEl();

    trocarClasse(iconeEl, CLASSES_ICONE, variante.icone);
    const simbolo = iconeEl?.querySelector<HTMLElement>('.material-symbols-outlined');
    if (simbolo) simbolo.textContent = opcoes.icone;
    trocarClasse(calloutEl, CLASSES_CALLOUT, variante.callout);

    if (btnConfirmar) {
        btnConfirmar.disabled = false;
        trocarClasse(btnConfirmar, CLASSES_BOTAO, variante.botao);
        definirRotuloConfirmar(btnConfirmar, opcoes.rotuloConfirmar, opcoes.icone);
    }
    if (btnCancelar) definirRotuloConfirmar(btnCancelar, opcoes.rotuloCancelar ?? 'shell.cancelar', '');

    if (tituloEl) tituloEl.textContent = titulo;
    if (mensagemEl) {
        mensagemEl.textContent = mensagem;
        mensagemEl.hidden = !mensagem;
    }

    if (detalhesEl) {
        if (opcoes.detalhesHtml) {
            detalhesEl.innerHTML = opcoes.detalhesHtml;
            detalhesEl.style.display = 'block';
        } else {
            detalhesEl.innerHTML = '';
            detalhesEl.style.display = 'none';
        }
    }

    if (calloutEl && calloutText) {
        if (textoAtencao) {
            calloutText.textContent = textoAtencao;
            calloutEl.style.display = 'flex';
        } else {
            calloutEl.style.display = 'none';
        }
    }

    let limpeza: (() => void) | undefined;
    if (container) {
        if (opcoes.conteudo) {
            container.innerHTML = opcoes.conteudo.html;
            container.style.display = 'block';
        } else {
            container.innerHTML = '';
            container.style.display = 'none';
        }
    }

    return new Promise((resolve) => {
        const onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') finalizar(false);
        };
        document.addEventListener('keydown', onKeydown);
        atual = {
            conteudo: opcoes.conteudo as ConteudoConfirmacao<unknown> | undefined,
            limpeza: undefined,
            resolver: resolve as (valor: unknown) => void,
            removerEscape: () => document.removeEventListener('keydown', onKeydown)
        };

        openModal(ID_MODAL);

        if (container && opcoes.conteudo?.aoAbrir) {
            const resultado = opcoes.conteudo.aoAbrir(container);
            if (typeof resultado === 'function') limpeza = resultado;
            atual.limpeza = limpeza;
        }
    });
}

/** Modal de exclusão (variante de erro, ícone de lixeira). Atalho de `confirmarAcao`. */
export function confirmarExclusao(
    { titulo = 'Confirmar exclusão', mensagem = 'Esta ação não pode ser desfeita.', detalhesHtml, textoAtencao, chaveConfirmar = 'shell.excluir_registro', iconeConfirmar = 'delete' }: ConfirmarExclusaoOpcoes = {}
): Promise<boolean> {
    return confirmarAcao({
        titulo,
        mensagem,
        detalhesHtml,
        textoAtencao,
        rotuloConfirmar: chaveConfirmar,
        variante: 'error',
        icone: iconeConfirmar
    });
}

/** Sets the confirm button's label/icon; the i18n key is stored so language switches keep it. */
export function definirRotuloConfirmar(botao: HTMLElement, chave: string, icone: string): void {
    botao.dataset.i18nKey = chave;
    const iconeEl = botao.querySelector<HTMLElement>('.material-symbols-outlined');
    if (iconeEl) iconeEl.textContent = icone;
    const texto = Array.from(botao.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
    if (texto) texto.textContent = ` ${t(chave)} `;
    else botao.append(` ${t(chave)} `);
}
