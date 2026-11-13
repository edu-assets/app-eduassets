import { initNavigation, initMobileNavigation } from './core/layout/index.js';
import { initModals, initConfirm } from './core/ui/index.js';
import { initTheme } from './core/state/themeStore.js';
import { initI18n } from './core/state/i18nStore.js';
import { initSessionTimeout } from './core/auth/sessionTimeout.js';
import { initDashboard } from './features/dashboard/index.js';
import { initControle } from './features/controle/index.js';
import { initCadastros } from './features/cadastros/index.js';
import { initEmprestimo } from './features/emprestimo/index.js';
import { initDevolucao } from './features/devolucao/index.js';
import { initExportar } from './features/exportar/index.js';
import { initConfig } from './features/config/index.js';
import { initAuthDataSync } from './core/state/authDataSync.js';
import { initAuth } from './features/auth/index.js';
import { initSeguranca } from './features/seguranca/index.js';
import { initPerfil } from './features/perfil/index.js';
import { initRfidListener } from './core/rfid/rfidListener.js';
import { initDocumentation } from './features/sobre/index.js';
import { initAnalyticsConsent } from './core/analytics/analyticsConsent.js';
import { initNotificacoes } from './core/notifications/index.js';
import { APP_VERSION } from './core/version.js';
import { initBannerNotificacoes } from './features/notificacoes/banner.js';
import { capturarPainelDaUrlInicial } from './core/notifications/notificationRouting.js';

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initI18n();
    // The static HTML already carries the version (Vite plugin); this keeps the badge right if it was cached or edited.
    const badgeVersao = document.getElementById('sobre-versao');
    if (badgeVersao) badgeVersao.textContent = `v${APP_VERSION}`;
    initModals();
    // A notification click can open the app at "/#panel-...": remember the panel before the entry route rewrites the hash.
    capturarPainelDaUrlInicial();
    // initAuth removes an emailed recovery token from the URL synchronously, before its first await,
    // so Analytics (only after consent) never sees it.
    const auth = initAuth();
    initAnalyticsConsent();
    await auth;
    await initAuthDataSync();

    // initNavigation runs last: every feature listens before the route in the URL (reload) opens its panel.
    const inits: Array<() => void | Promise<void>> = [
        initMobileNavigation,
        initConfirm,
        initSessionTimeout,
        initDashboard,
        initControle,
        initCadastros,
        initEmprestimo,
        initDevolucao,
        initExportar,
        initConfig,
        initSeguranca,
        initRfidListener,
        initPerfil,
        initDocumentation,
        initNotificacoes,
        initBannerNotificacoes,
        initNavigation
    ];

    inits.forEach((fn) => {
        try {
            Promise.resolve(fn()).catch((err) => {
                console.error(`[eduAssets] Fail to initialize "${fn.name}":`, err);
            });
        } catch (err) {
            console.error(`[eduAssets] Fail to initialize "${fn.name}":`, err);
        }
    });
});
