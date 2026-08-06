export function initModals(): void {
    document.querySelectorAll<HTMLElement>('.modal-overlay').forEach((overlay) => {
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
    if (modal) modal.classList.add('active');
}

export function closeModal(id: string): void {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}