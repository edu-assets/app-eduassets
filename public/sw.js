/*
 * eduAssets service worker — Web Push only (no offline cache).
 * Served from the site root so its scope is "/". Plain JavaScript on purpose: it is not bundled.
 *
 * Push payload (JSON): { v: 1, tipo, titulo, corpo, url, tag, criadoEm }
 */
const ICON = '/assets/icons/eduAssets_icon-192.png';
const BADGE = '/assets/icons/eduAssets_icon48x.png';
const FALLBACK_TITLE = 'eduAssets';
const FALLBACK_BODY = 'Nova atividade no eduAssets';
const VIBRATE_PATTERN = [200, 100, 200, 100, 300];

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

function readPayload(event) {
    if (!event.data) return null;
    try {
        const data = event.data.json();
        return data && typeof data === 'object' && data.v === 1 ? data : null;
    } catch {
        return null;
    }
}

/** Only same-origin targets are allowed; anything else falls back to the app root. */
function safeUrl(value) {
    try {
        const target = new URL(typeof value === 'string' ? value : '/', self.location.origin);
        return target.origin === self.location.origin ? target.href : self.location.origin + '/';
    } catch {
        return self.location.origin + '/';
    }
}

function text(value, fallback, max) {
    return typeof value === 'string' && value.trim() ? value.slice(0, max) : fallback;
}

self.addEventListener('push', (event) => {
    const payload = readPayload(event);
    const title = text(payload && payload.titulo, FALLBACK_TITLE, 120);
    const body = text(payload && payload.corpo, FALLBACK_BODY, 300);
    const criadoEm = payload && Date.parse(payload.criadoEm);

    const options = {
        body,
        icon: ICON,
        badge: BADGE,
        tag: text(payload && payload.tag, 'eduassets-atividade', 64),
        renotify: true,
        requireInteraction: true,
        vibrate: VIBRATE_PATTERN,
        timestamp: Number.isFinite(criadoEm) ? criadoEm : Date.now(),
        data: { url: safeUrl(payload && payload.url) }
    };

    event.waitUntil((async () => {
        await self.registration.showNotification(title, options);
        // Let open tabs show an in-app alert (toast + sound).
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        windows.forEach((client) => {
            client.postMessage({
                type: 'eduassets:notificacao',
                payload: payload || { v: 1, tipo: 'GENERICA', titulo: title, corpo: body, url: options.data.url }
            });
        });
    })());
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = safeUrl(event.notification.data && event.notification.data.url);

    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const existing = windows.find((client) => client.url.startsWith(self.location.origin));
        if (existing) {
            // The app routes to the right panel itself, preserving the open session and state.
            existing.postMessage({ type: 'eduassets:abrir', url: target });
            if ('focus' in existing) await existing.focus();
            return;
        }
        await self.clients.openWindow(target);
    })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil((async () => {
        const key = event.oldSubscription && event.oldSubscription.options
            ? event.oldSubscription.options.applicationServerKey
            : null;
        if (key) {
            try {
                await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
            } catch {
                // The app re-syncs (or asks the administrator to re-enable) on the next visit.
            }
        }
        // Binding the (new) subscription to the user needs the authenticated session, so ask a window to sync.
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        windows.forEach((client) => client.postMessage({ type: 'eduassets:push-resync' }));
    })());
});
