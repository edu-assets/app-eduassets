let elementoComFocoAnterior: HTMLElement | null = null;

function getElementosFocaveis(container: HTMLElement): HTMLElement[] {
    const seletor = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll<HTMLElement>(seletor))
        .filter((el) => el.offsetParent !== null);
}

function trapFocus(overlay: HTMLElement, e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;

    const box = overlay.querySelector<HTMLElement>('.modal-box') ?? overlay;
    const focaveis = getElementosFocaveis(box);
    if (!focaveis.length) return;

    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];

    if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
    }
}

export function initModals(): void {
    document.querySelectorAll<HTMLElement>('.modal-overlay').forEach((overlay) => {
        const box = overlay.querySelector<HTMLElement>('.modal-box');

        if (box) {
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-modal', 'true');
            if (!box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1');

            const tituloEl = box.querySelector('.modal-header h3, .modal-header-titles h3');
            if (tituloEl) {
                if (!tituloEl.id) tituloEl.id = `${overlay.id}-titulo`;
                box.setAttribute('aria-labelledby', tituloEl.id);
            }
        }

        const header = overlay.querySelector('.modal-header');

        if (header && !header.querySelector('.modal-close-btn')) {
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'modal-close-btn';
            closeBtn.setAttribute('aria-label', 'Fechar');
            closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
            closeBtn.addEventListener('click', () => closeModal(overlay.id));
            header.appendChild(closeBtn);
        }

        overlay.addEventListener('keydown', (e) => trapFocus(overlay, e));

        if (overlay.dataset.closeOnOverlay === 'false') return;

        let mousedownNoOverlay = false;

        overlay.addEventListener('mousedown', (e) => {
            mousedownNoOverlay = e.target === overlay;
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && mousedownNoOverlay) closeModal(overlay.id);
            mousedownNoOverlay = false;
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const activeModal = document.querySelector<HTMLElement>('.modal-overlay.active');
        if (activeModal && activeModal.dataset.closeOnOverlay !== 'false') closeModal(activeModal.id);
    });
}

export function openModal(id: string): void {
    const modal = document.getElementById(id);
    if (!modal) return;

    elementoComFocoAnterior = document.activeElement as HTMLElement | null;
    modal.classList.add('active');

    const box = modal.querySelector<HTMLElement>('.modal-box');
    const focaveis = box ? getElementosFocaveis(box) : [];
    (focaveis[0] ?? box)?.focus();
}

export function closeModal(id: string): void {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');

    elementoComFocoAnterior?.focus();
    elementoComFocoAnterior = null;
}