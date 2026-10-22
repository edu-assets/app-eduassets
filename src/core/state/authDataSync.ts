import { subscribe, isAutenticado } from './authStore.js';
import {
    carregarEquipamentos, limparEquipamentos,
    carregarEmprestimos, limparEmprestimos,
    carregarOcorrencias, limparOcorrencias,
    carregarResponsaveis, limparResponsaveis,
} from './index.js';
import { advanceSessionDataVersion, getSessionDataVersion } from './sessionDataVersion.js';
import { createSessionDataCoordinator } from './sessionDataCoordinator.js';
import { showToast } from '../ui/index.js';
import { t } from './i18nStore.js';

const coordinator = createSessionDataCoordinator({
    nextVersion: advanceSessionDataVersion,
    getVersion: getSessionDataVersion,
    isCurrent: (version) => version === getSessionDataVersion(),
    clear: () => {
        limparEquipamentos();
        limparEmprestimos();
        limparOcorrencias();
        limparResponsaveis();
    },
    loadPublic: () => [carregarEquipamentos(), carregarEmprestimos(), carregarOcorrencias()],
    loadPrivate: () => [carregarResponsaveis()],
});

let unsubscribeAuth: (() => void) | undefined;

export async function initAuthDataSync(): Promise<void> {
    if (!unsubscribeAuth) {
        unsubscribeAuth = subscribe(({ autenticado }) => {
            void synchronize(autenticado);
        });
    }
    await synchronize(isAutenticado());
}

async function synchronize(authenticated: boolean): Promise<void> {
    try {
        await coordinator.sync(authenticated);
    } catch (error) {
        console.error('[eduAssets] Falha ao sincronizar dados da sessão:', error);
        showToast(t('feedback.erro_carregar_dados_iniciais'), 'error');
    }
}
