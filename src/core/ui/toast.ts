import { traduzirTexto } from '../state/i18nStore.js';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

const DEFAULT_DURATION = 3500;
// "info" carries notifications the user should actually read (e.g. a new loan), so it stays longer.
const DURATIONS: Partial<Record<ToastType, number>> = { info: 9000 };
const MAX_TOASTS = 4;

const ICONS: Record<ToastType, string> = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'notifications_active'
};

let root: HTMLDivElement | null = null;
let polite: HTMLDivElement | null = null;
let assertive: HTMLDivElement | null = null;

function makeRegion(role: 'status' | 'alert', live: 'polite' | 'assertive'): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toast-region';
    el.setAttribute('role', role);
    el.setAttribute('aria-live', live);
    el.setAttribute('aria-atomic', 'false');
    return el;
}

function getRegion(type: ToastType): HTMLDivElement {
    if (!root || !root.isConnected) {
        root = document.createElement('div');
        root.className = 'toast-container';
        polite = makeRegion('status', 'polite');
        assertive = makeRegion('alert', 'assertive');
        root.append(polite, assertive);
        document.body.appendChild(root);
    }
    return (type === 'error' ? assertive : polite) as HTMLDivElement;
}

export interface ToastOptions {
    duration?: number;
}

export function showToast(message: string, type: ToastType = 'success', options: ToastOptions | number = {}): void {
    const opts: ToastOptions = typeof options === 'number' ? { duration: options } : options;
    const duration = opts.duration ?? DURATIONS[type] ?? DEFAULT_DURATION;
    message = traduzirTexto(message);
    const region = getRegion(type);
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = ICONS[type] || ICONS.success;

    const text = document.createElement('span');
    text.className = 'toast-message';
    text.textContent = message;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', traduzirTexto('Fechar notificação'));
    const closeIcon = document.createElement('span');
    closeIcon.className = 'material-symbols-outlined';
    closeIcon.setAttribute('aria-hidden', 'true');
    closeIcon.textContent = 'close';
    close.appendChild(closeIcon);

    toast.append(icon, text, close);

    let timer: ReturnType<typeof setTimeout> | undefined;
    let remaining = duration;
    let startedAt = 0;
    let removed = false;

    const dismiss = (): void => {
        if (removed) return;
        removed = true;
        if (timer) clearTimeout(timer);
        toast.classList.add('toast-leaving');
        toast.addEventListener('animationend', () => toast.remove());
        // Fallback when animations are disabled (reduced motion / no animation events).
        setTimeout(() => toast.remove(), 400);
    };
    const start = (): void => {
        if (type === 'error' || removed) return; // errors persist until closed
        if (timer) clearTimeout(timer);
        startedAt = Date.now();
        timer = setTimeout(dismiss, remaining);
    };
    const pause = (): void => {
        if (!timer) return;
        clearTimeout(timer);
        timer = undefined;
        remaining = Math.max(0, remaining - (Date.now() - startedAt));
    };

    close.addEventListener('click', dismiss);
    toast.addEventListener('mouseenter', pause);
    toast.addEventListener('mouseleave', () => { if (!toast.matches(':focus-within')) start(); });
    toast.addEventListener('focusin', pause);
    toast.addEventListener('focusout', () => { if (!toast.matches(':hover')) start(); });

    region.appendChild(toast);

    const active = [...(root as HTMLElement).querySelectorAll('.toast:not(.toast-leaving)')];
    if (active.length > MAX_TOASTS) {
        active.slice(0, active.length - MAX_TOASTS).forEach(el => el.remove());
    }

    start();
}
