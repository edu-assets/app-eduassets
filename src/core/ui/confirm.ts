import { openModal, closeModal } from './modal.js';

interface ConfirmarExclusaoOpcoes {
    titulo?: string;
    mensagem?: string;
    detalhesHtml?: string;
    textoAtencao?: string; 
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
    { titulo = 'Confirmar exclusão', mensagem = 'Esta ação não pode ser desfeita.', detalhesHtml, textoAtencao }: ConfirmarExclusaoOpcoes = {}
): Promise<boolean> {
    const overlay = document.getElementById('modal-confirmar-exclusao');
    if (!overlay) return Promise.resolve(window.confirm(mensagem));

    const tituloEl = document.getElementById('confirmar-exclusao-titulo');
    const mensagemEl = document.getElementById('confirmar-exclusao-mensagem');
    const detalhesEl = document.getElementById('confirmar-exclusao-detalhes');
    const calloutEl = document.getElementById('confirmar-exclusao-callout');
    const calloutText = document.getElementById('confirmar-exclusao-callout-text');
    const btnConfirmar = document.getElementById('confirmar-exclusao-btn') as HTMLButtonElement | null;

     if (btnConfirmar) btnConfirmar.disabled = false;

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