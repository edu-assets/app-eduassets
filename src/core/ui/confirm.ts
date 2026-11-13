import { openModal, closeModal } from './modal.js';
import { t, traduzirTexto } from '../state/i18nStore.js';

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

let resolverAtual: ((valor: boolean) => void) | null = null;

export function initConfirm(): void {
    const overlay = document.getElementById('modal-confirmar-exclusao');
    if (!overlay) return;

    const btnConfirmar = document.getElementById('confirmar-exclusao-btn');
    const btnCancelar = document.getElementById('confirmar-exclusao-cancelar');

    btnConfirmar?.addEventListener('click', () => finalizar(true));
    btnCancelar?.addEventListener('click', () => finalizar(false));

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) finalizar(false);
    });

    function finalizar(valor: boolean): void {
        closeModal('modal-confirmar-exclusao');
        if (resolverAtual) {
            resolverAtual(valor);
            resolverAtual = null;
        }
    }
}

export function confirmarExclusao(
    { titulo = 'Confirmar exclusão', mensagem = 'Esta ação não pode ser desfeita.', detalhesHtml, textoAtencao, chaveConfirmar = 'shell.excluir_registro', iconeConfirmar = 'delete' }: ConfirmarExclusaoOpcoes = {}
): Promise<boolean> {
    const overlay = document.getElementById('modal-confirmar-exclusao');
    titulo = traduzirTexto(titulo);
    mensagem = traduzirTexto(mensagem);
    textoAtencao = textoAtencao ? traduzirTexto(textoAtencao) : textoAtencao;
    if (!overlay) return Promise.resolve(window.confirm(mensagem));

    const tituloEl = document.getElementById('confirmar-exclusao-titulo');
    const mensagemEl = document.getElementById('confirmar-exclusao-mensagem');
    const detalhesEl = document.getElementById('confirmar-exclusao-detalhes');
    const calloutEl = document.getElementById('confirmar-exclusao-callout');
    const calloutText = document.getElementById('confirmar-exclusao-callout-text');
    const btnConfirmar = document.getElementById('confirmar-exclusao-btn') as HTMLButtonElement | null;

    if (btnConfirmar) {
        btnConfirmar.disabled = false;
        definirRotuloConfirmar(btnConfirmar, chaveConfirmar, iconeConfirmar);
    }

    if (tituloEl) tituloEl.textContent = titulo;
    if (mensagemEl) mensagemEl.textContent = mensagem;

    if (detalhesEl) {
        if (detalhesHtml) {
            detalhesEl.innerHTML = detalhesHtml;
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

    openModal('modal-confirmar-exclusao');

    return new Promise((resolve) => {
        const onKeydown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            document.removeEventListener('keydown', onKeydown);
            resolve(false);
        };
        document.addEventListener('keydown', onKeydown);

        resolverAtual = (valor: boolean) => {
            document.removeEventListener('keydown', onKeydown);
            resolve(valor);
        };
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
