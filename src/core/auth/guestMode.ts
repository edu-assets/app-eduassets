import { showToast } from '../ui/index.js';
import { t, traduzirTexto } from '../state/i18nStore.js';

export const GUEST_MESSAGE = 'Faça login para registrar alterações.';
const msg = (): string => t('convidado.aviso');
const DISMISS_KEY = 'guest-banner-dismissed';
const GATED = '[data-requires-auth], [data-requires-admin]';
const PREV_TITLE = 'guestPrevTitle';
const PREV_TAB = 'guestPrevTabindex';
const PREV_TITLE_KEY = 'guestPrevTitleKey';

/** Dispatched on document by the guest "Entrar" buttons; the auth feature opens the login screen. */
export const EVENTO_ABRIR_LOGIN = 'eduassets:abrir-login';

function openLogin(): void {
    document.dispatchEvent(new CustomEvent(EVENTO_ABRIR_LOGIN));
}

function isDismissed(): boolean {
    try {
        return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
        return false;
    }
}

function buildBanner(id: string, className: string, textKey: string, dismissible: boolean): HTMLElement {
    const el = document.createElement('div');
    el.id = id;
    el.className = className;
    el.setAttribute('role', 'status');
    el.innerHTML =
        `<span class="material-symbols-outlined" aria-hidden="true">visibility</span>` +
        `<span class="guest-banner__text"></span>` +
        `<button type="button" class="btn btn-primary guest-banner__login" data-i18n-key="shell.entrar">${t('shell.entrar')}</button>` +
        (dismissible
            ? `<button type="button" class="guest-banner__close" aria-label="${t('convidado.dispensar')}">` +
              `<span class="material-symbols-outlined" aria-hidden="true">close</span></button>`
            : '');
    const textEl = el.querySelector('.guest-banner__text') as HTMLElement;
    textEl.dataset.i18nKey = textKey;
    textEl.textContent = t(textKey);
    el.querySelector('.guest-banner__login')!.addEventListener('click', openLogin);
    el.querySelector('.guest-banner__close')?.addEventListener('click', () => {
        try {
            sessionStorage.setItem(DISMISS_KEY, '1');
        } catch {
            /* ignore */
        }
        el.remove();
    });
    return el;
}

function syncBanners(guest: boolean): void {
    const main = document.querySelector('.main-content');
    const banner = document.getElementById('guest-banner');
    if (!guest) {
        banner?.remove();
        document.getElementById('guest-loan-notice')?.remove();
        return;
    }
    if (main && !banner && !isDismissed()) {
        main.prepend(buildBanner('guest-banner', 'guest-banner', 'convidado.banner', true));
    }
    const panel = document.getElementById('panel-emprestimo');
    if (panel && !document.getElementById('guest-loan-notice')) {
        const sub = panel.querySelector('.panel-subtitle');
        const notice = buildBanner('guest-loan-notice', 'guest-banner guest-banner--inline', 'convidado.aviso', false);
        if (sub) sub.after(notice);
        else panel.prepend(notice);
    }
}

function gate(el: HTMLElement): void {
    if (el.getAttribute('aria-disabled') === 'true') return;
    el.setAttribute('aria-disabled', 'true');
    el.dataset[PREV_TITLE] = el.getAttribute('title') ?? '';
    el.dataset[PREV_TAB] = el.getAttribute('tabindex') ?? '';
    if (el.dataset.i18nTitle) el.dataset[PREV_TITLE_KEY] = el.dataset.i18nTitle;
    el.setAttribute('title', msg());
}

function ungate(el: HTMLElement): void {
    if (!(PREV_TITLE in el.dataset)) return;
    el.removeAttribute('aria-disabled');
    const prev = el.dataset[PREV_TITLE];
    const key = el.dataset[PREV_TITLE_KEY];
    if (prev) {
        el.setAttribute('title', key ? t(key) : traduzirTexto(prev));
        if (key) el.dataset.i18nTitle = key;
        else delete el.dataset.i18nTitle;
    } else {
        el.removeAttribute('title');
        delete el.dataset.i18nTitle;
    }
    const tab = el.dataset[PREV_TAB];
    if (tab) el.setAttribute('tabindex', tab);
    else el.removeAttribute('tabindex');
    delete el.dataset[PREV_TITLE];
    delete el.dataset[PREV_TAB];
    delete el.dataset[PREV_TITLE_KEY];
}

function syncControls(guest: boolean): void {
    document.querySelectorAll<HTMLElement>(GATED).forEach(el => (guest ? gate(el) : ungate(el)));
}

let observer: MutationObserver | null = null;

/** Gated controls rendered later (lists, menus) get the same affordances; only childList changes, so no loops. */
function watchNewControls(guest: boolean): void {
    if (!guest) {
        observer?.disconnect();
        observer = null;
        return;
    }
    if (observer || !document.body) return;
    observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            m.addedNodes.forEach(node => {
                if (!(node instanceof HTMLElement)) return;
                if (node.matches(GATED)) gate(node);
                node.querySelectorAll<HTMLElement>(GATED).forEach(gate);
            });
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function intercept(e: Event): void {
    const t = e.target as Element | null;
    const el = t?.closest?.(GATED);
    if (!el || !document.body.classList.contains('guest-mode')) return;
    if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!(e instanceof KeyboardEvent) || e.type === 'keydown') showToast(msg(), 'warning');
}

let listening = false;

/** Applies (or removes) all guest-mode affordances. Idempotent. */
export function applyGuestMode(guest: boolean): void {
    syncBanners(guest);
    syncControls(guest);
    watchNewControls(guest);
    if (!listening) {
        listening = true;
        for (const type of ['click', 'keydown', 'keyup']) document.addEventListener(type, intercept, true);
    }
}
