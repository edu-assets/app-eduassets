import { traduzirTexto } from '../state/i18nStore.js';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

const DEFAULT_DURATION = 3500;
// "info" carries notifications the user should actually read (e.g. a new loan), so it stays longer.
const DURATIONS: Partial<Record<ToastType, number>> = { info: 9000, error: 8000, warning: 5000 };
const MAX_TOASTS = 3;
// A pause (hover/focus) can never hold a toast longer than this: focus may stick after a tap on mobile.
const MAX_PAUSE = 4000;
const active = new Map<string, { el: HTMLElement; restart: () => void; discard: () => void }>();

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
    const key = `${type}:${message}`;
    const existing = active.get(key);
    if (existing && existing.el.isConnected && !existing.el.classList.contains('toast-leaving')) {
        existing.restart();
        return;
    }
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
    let pauseTimer: ReturnType<typeof setTimeout> | undefined;
    let remaining = duration;
    let startedAt = 0;
    let removed = false;

    const dismiss = (): void => {
        if (removed) return;
        removed = true;
        if (timer) clearTimeout(timer);
        if (pauseTimer) clearTimeout(pauseTimer);
        if (active.get(key)?.el === toast) active.delete(key);
        toast.classList.add('toast-leaving');
        toast.addEventListener('animationend', () => toast.remove());
        // Fallback when animations are disabled (reduced motion / no animation events).
        setTimeout(() => toast.remove(), 400);
    };
    const start = (): void => {
        if (removed) return;
        if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = undefined; }
        if (timer) clearTimeout(timer);
        startedAt = Date.now();
        timer = setTimeout(dismiss, remaining);
    };
    const pause = (): void => {
        if (removed) return;
        if (timer) {
            clearTimeout(timer);
            timer = undefined;
            remaining = Math.max(0, remaining - (Date.now() - startedAt));
        }
        if (!pauseTimer) pauseTimer = setTimeout(() => { pauseTimer = undefined; start(); }, MAX_PAUSE);
    };
    /** Evicted by the visible-toast cap: removed at once, timers cleared. */
    const discard = (): void => {
        removed = true;
        if (timer) clearTimeout(timer);
        if (pauseTimer) clearTimeout(pauseTimer);
        toast.remove();
    };
    const restart = (): void => {
        if (removed) return;
        remaining = duration;
        start();
        toast.classList.remove('toast-pulse');
        void toast.offsetWidth;
        toast.classList.add('toast-pulse');
    };

    close.addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
    toast.addEventListener('mouseenter', pause);
    toast.addEventListener('mouseleave', () => start());
    toast.addEventListener('focusin', pause);
    toast.addEventListener('focusout', () => start());

    active.set(key, { el: toast, restart, discard });
    region.appendChild(toast);

    while (active.size > MAX_TOASTS) {
        const [k, v] = active.entries().next().value as [string, { discard: () => void }];
        active.delete(k);
        v.discard();
    }

    start();
}
