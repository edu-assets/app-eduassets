import { openModal, closeModal } from '../modal/modal.js';

let resolverAtual = null;

export function initConfirm() {
    const overlay = document.getElementById('modal-confirmar-exclusao');
    if (!overlay) return;

    const btnConfirmar = document.getElementById('confirmar-exclusao-btn');
    const btnCancelar = document.getElementById('confirmar-exclusao-cancelar');

    btnConfirmar.addEventListener('click', () => finalizar(true));
    btnCancelar.addEventListener('click', () => finalizar(false));

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) finalizar(false);
    });

    function finalizar(valor) {
        closeModal('modal-confirmar-exclusao');
        if (resolverAtual) {
            resolverAtual(valor);
            resolverAtual = null;
        }
    }
}

export function confirmarExclusao({ titulo = 'Confirmar exclusão', mensagem = 'Esta ação não pode ser desfeita.' } = {}) {
    const overlay = document.getElementById('modal-confirmar-exclusao');
    if (!overlay) return Promise.resolve(window.confirm(mensagem));

    document.getElementById('confirmar-exclusao-titulo').textContent = titulo;
    document.getElementById('confirmar-exclusao-mensagem').textContent = mensagem;

    openModal('modal-confirmar-exclusao');

    return new Promise((resolve) => {
        const onKeydown = (e) => {
            if (e.key !== 'Escape') return;
            document.removeEventListener('keydown', onKeydown);
            resolve(false);
        };
        document.addEventListener('keydown', onKeydown);

        resolverAtual = (valor) => {
            document.removeEventListener('keydown', onKeydown);
            resolve(valor);
        };
    });
}