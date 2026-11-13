import { isAdmin } from '../auth/permissions.js';
import { subscribe } from '../state/authStore.js';
import { pushDisponivelNoServidor } from '../api/notificacoes.js';
import { registrarDesbloqueioDeAudio } from './alertSound.js';
import { ouvirMensagensDoServiceWorker } from './inAppAlerts.js';
import { aplicarPainelPendente, descartarPainelPendente } from './notificationRouting.js';
import { initAtivacaoPush } from './pushActivation.js';
import { registrarServiceWorker, sincronizar } from './pushNotifications.js';

let adminPreparado = false;

async function prepararAdministrador(): Promise<void> {
    if (adminPreparado) {
        aplicarPainelPendente();
        return;
    }
    adminPreparado = true;
    // Without VAPID keys on the API there is nothing to register or sync.
    if (await pushDisponivelNoServidor()) {
        await registrarServiceWorker();
        // An existing browser subscription may belong to the previous user of this device: bind it to this one.
        await sincronizar();
    }
    aplicarPainelPendente();
}

/**
 * Starts the notifications module without blocking startup: the in-app alert listener and audio unlock are
 * cheap and always on; the service worker is only registered for authenticated administrators.
 */
export function initNotificacoes(): void {
    registrarDesbloqueioDeAudio();
    initAtivacaoPush();
    ouvirMensagensDoServiceWorker();

    const aoMudarSessao = (autenticado: boolean): void => {
        if (autenticado && isAdmin()) {
            void prepararAdministrador().catch((erro) => console.error('[eduAssets] Notifications setup failed:', erro));
            return;
        }
        adminPreparado = false;
        if (autenticado) descartarPainelPendente();
    };

    subscribe(({ autenticado }) => aoMudarSessao(autenticado));
    aoMudarSessao(isAdmin());
}

