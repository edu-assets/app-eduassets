import { HASHES_APP_CONHECIDOS } from '../layout/appRoutes.js';

/**
 * Google Analytics 4 loaded only after explicit consent (LGPD). Without a "granted" choice no Google
 * script is requested and no analytics cookie is written. The choice is stored per browser in
 * localStorage and can be changed at any time from the privacy policy.
 */
export const GA_MEASUREMENT_ID = 'G-9LJ1MQRCEV';
export const CONSENT_STORAGE_KEY = 'eduassets_analytics_consent';
/** Bump when the purposes described in the privacy policy change, so the banner asks again. */
export const CONSENT_VERSION = 1;

export type ConsentChoice = 'granted' | 'denied';

interface StoredConsent {
    v: number;
    choice: ConsentChoice;
    at: string;
}

type Gtag = (...args: unknown[]) => void;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag } & Record<string, unknown>;

export function readConsent(storage: Pick<Storage, 'getItem'> | null = safeStorage()): ConsentChoice | null {
    try {
        const raw = storage?.getItem(CONSENT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<StoredConsent>;
        if (parsed.v !== CONSENT_VERSION) return null;
        return parsed.choice === 'granted' || parsed.choice === 'denied' ? parsed.choice : null;
    } catch {
        return null;
    }
}

export function writeConsent(choice: ConsentChoice, storage: Pick<Storage, 'setItem'> | null = safeStorage(), now = new Date()): void {
    try {
        storage?.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: CONSENT_VERSION, choice, at: now.toISOString() } satisfies StoredConsent));
    } catch {
        // Storage blocked: the choice only lasts for this page view.
    }
}

/**
 * Page location sent to Analytics: origin + path + a plain route hash (#app, #login…) or one of the fixed
 * panel routes (#app/devolucoes, #app/dashboard/historico…). Fragments carrying values, such as the
 * emailed password-reset token, are never sent.
 */
export function sanitizePageLocation(href: string): string {
    const url = new URL(href);
    const route = /^#[a-z][a-z-]*$/i.test(url.hash) || HASHES_APP_CONHECIDOS.has(url.hash) ? url.hash : '';
    return `${url.origin}${url.pathname}${route}`;
}

/** Names of the GA cookies present in a `document.cookie` string. */
export function analyticsCookieNames(cookieString: string): string[] {
    return cookieString
        .split(';')
        .map((part) => part.split('=')[0]?.trim() ?? '')
        .filter((name) => name === '_ga' || name.startsWith('_ga_') || name === '_gid' || name === '_gat');
}

/** Hostname and each parent domain (app.eduassets.tech → [app.eduassets.tech, eduassets.tech]). */
export function cookieDomains(hostname: string): string[] {
    const parts = hostname.split('.');
    const domains: string[] = [];
    for (let i = 0; i < parts.length - 1; i++) domains.push(parts.slice(i).join('.'));
    return domains.length ? domains : [hostname];
}

function safeStorage(): Storage | null {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

let loaded = false;

function loadAnalytics(): void {
    const w = window as unknown as AnalyticsWindow;
    w[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
    if (loaded) return;
    loaded = true;
    w.dataLayer = w.dataLayer ?? [];
    const gtag: Gtag = function gtag() {
        // gtag.js expects the Arguments object itself.
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer!.push(arguments);
    };
    w.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
        page_location: sanitizePageLocation(window.location.href),
        cookie_domain: window.location.hostname,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
    });
    window.addEventListener('hashchange', () => {
        gtag('set', { page_location: sanitizePageLocation(window.location.href) });
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    document.head.appendChild(script);
}

function disableAnalytics(): void {
    (window as unknown as AnalyticsWindow)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
    const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    for (const name of analyticsCookieNames(document.cookie)) {
        document.cookie = `${name}=; ${expired}`;
        for (const domain of cookieDomains(window.location.hostname)) {
            document.cookie = `${name}=; ${expired}; domain=${domain}`;
        }
    }
}

export function applyConsent(choice: ConsentChoice): void {
    writeConsent(choice);
    if (choice === 'granted') loadAnalytics();
    else disableAnalytics();
    updateBanner();
}

function banner(): HTMLElement | null {
    return document.getElementById('cookie-consent');
}

function updateBanner(forceOpen = false): void {
    const el = banner();
    if (!el) return;
    const open = forceOpen || readConsent() === null;
    el.hidden = !open;
    document.documentElement.classList.toggle('has-cookie-consent', open);
}

/** Reopens the consent banner (e.g. from the privacy policy) so the choice can be changed. */
export function openConsentPreferences(): void {
    updateBanner(true);
    banner()?.querySelector<HTMLButtonElement>('[data-consent-choice="granted"]')?.focus();
}

export function initAnalyticsConsent(): void {
    const el = banner();
    el?.querySelectorAll<HTMLButtonElement>('[data-consent-choice]').forEach((button) => {
        button.addEventListener('click', () => {
            const choice = button.dataset.consentChoice;
            if (choice === 'granted' || choice === 'denied') applyConsent(choice);
        });
    });
    document.addEventListener('click', (event) => {
        const trigger = (event.target as HTMLElement | null)?.closest('[data-open-cookie-preferences]');
        if (!trigger) return;
        event.preventDefault();
        openConsentPreferences();
    });

    if (readConsent() === 'granted') loadAnalytics();
    updateBanner();
}
