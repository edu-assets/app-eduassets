const ICONS = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning'
};

let container = null;

function getContainer() {
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

export function showToast(message, type = 'success', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined">${ICONS[type] || ICONS.success}</span><span>${message}</span>`;

    getContainer().appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-leaving');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}