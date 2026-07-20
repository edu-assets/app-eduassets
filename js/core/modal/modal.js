export function initModals() {
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
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

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) closeModal(activeModal.id);
    });
}

export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}