import { traduzirTexto } from '../state/i18nStore.js';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

const DEFAULT_DURATION = 3500;
// "info" carries notifications the user should actually read (e.g. a new loan), so it stays longer.
const DURATIONS: Partial<Record<ToastType, number>> = { info: 9000 };

const ICONS: Record<ToastType, string> = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'notifications_active'
};

let container: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

export function showToast(message: string, type: ToastType = 'success', duration: number = DURATIONS[type] ?? DEFAULT_DURATION): void {
    message = traduzirTexto(message);
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = ICONS[type] || ICONS.success;

    const text = document.createElement('span');
    text.className = 'toast-message';
    text.textContent = message;

    toast.append(icon, text);

    getContainer().appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-leaving');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}
