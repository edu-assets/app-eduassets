import { isAdmin } from '../../core/auth/permissions.js';
import { pushDisponivelNoServidor } from '../../core/api/notificacoes.js';
import { subscribe as subscribeAuth } from '../../core/state/authStore.js';
import { subscribe as subscribeI18n, t } from '../../core/state/i18nStore.js';
import { bannerDispensado, decidirBanner, dispensarBanner } from '../../core/notifications/pushBanner.js';
import type { VarianteBanner } from '../../core/notifications/pushBanner.js';
import { definirBannerVisivel, EVENTO_ESTADO_PUSH, solicitarAtivacao } from '../../core/notifications/pushActivation.js';
import { obterEstadoPush } from '../../core/notifications/pushNotifications.js';
import { setButtonLoading } from '../../shared/dom/buttonLoading.js';

const TEXTO_POR_VARIANTE: Record<Exclude<VarianteBanner, 'oculto'>, string> = {
    ativar: 'notif.banner_texto',
    bloqueado: 'notif.ajuda_bloqueado',
    ios: 'notif.banner_ios'
};

/**
 * Slim bar at the top of the main content offering to turn on push notifications on this device.
 * Shown only to authenticated administrators when the API has push, the browser can (or could) subscribe and
 * this browser has no subscription yet; "Agora não" hides it for 7 days on this device.
 * Re-evaluated on session change, language change, tab focus and whenever the push state changes
 * (EVENTO_ESTADO_PUSH: activation/deactivation in the Settings card, auto-activation).
 */
export function initBannerNotificacoes(): void {
    const banner = document.getElementById('push-banner');
    const texto = document.getElementById('push-banner-texto');
    const btnAtivar = document.getElementById('push-banner-ativar') as HTMLButtonElement | null;
    const btnDispensar = document.getElementById('push-banner-dispensar') as HTMLButtonElement | null;
    if (!banner || !texto || !btnAtivar || !btnDispensar) return;

    let avaliacao = 0;

    function pintar(variante: VarianteBanner): void {
        const visivel = variante !== 'oculto';
        banner!.hidden = !visivel;
        banner!.dataset.variante = variante;
        // While visible (and not for iOS, where nothing can be activated), a manual permission grant is auto-completed.
        definirBannerVisivel(variante === 'ativar' || variante === 'bloqueado');
        if (!visivel) return;
        banner!.setAttribute('aria-label', t('notif.banner_aria'));
        texto!.textContent = t(TEXTO_POR_VARIANTE[variante]);
        btnAtivar!.hidden = variante !== 'ativar';
        const rotuloAtivar = btnAtivar!.querySelector<HTMLElement>('.btn-label');
        if (rotuloAtivar) rotuloAtivar.textContent = t('notif.banner_ativar');
        btnDispensar!.textContent = t('notif.banner_agora_nao');
    }

    async function avaliar(): Promise<void> {
        const atual = ++avaliacao;
        // Hide synchronously for non-admins (logout, role change) before any await.
        if (!isAdmin()) {
            pintar('oculto');
            return;
        }
        const [servidorPush, estado] = await Promise.all([
            pushDisponivelNoServidor().catch(() => false),
            obterEstadoPush().catch(() => null)
        ]);
        if (atual !== avaliacao) return;
        if (!isAdmin() || !estado) {
            pintar('oculto');
            return;
        }
        pintar(decidirBanner({
            admin: true,
            servidorPush,
            suporte: estado.suporte,
            inscrito: estado.inscrito,
            dispensado: bannerDispensado()
        }));
    }

    btnAtivar.addEventListener('click', () => {
        if (!isAdmin()) return;
        setButtonLoading(btnAtivar, true);
        // solicitarAtivacao() asks for the permission synchronously inside this click (user gesture).
        void solicitarAtivacao().then((ativou) => {
            if (ativou) {
                avaliacao += 1;
                pintar('oculto');
            }
        }).finally(() => {
            setButtonLoading(btnAtivar, false);
            void avaliar();
        });
    });

    btnDispensar.addEventListener('click', () => {
        dispensarBanner();
        avaliacao += 1;
        pintar('oculto');
    });

    subscribeAuth(() => { void avaliar(); });
    subscribeI18n(() => { void avaliar(); });
    window.addEventListener(EVENTO_ESTADO_PUSH, () => { void avaliar(); });
    window.addEventListener('focus', () => { void avaliar(); });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void avaliar();
    });

    void avaliar();
}
