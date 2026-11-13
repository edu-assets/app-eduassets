import { subscribe, isAutenticado, getUsuario } from './authStore.js';
import { http } from '../api/apiClient.js';
import {
    carregarEquipamentos, limparEquipamentos,
    carregarEmprestimos, limparEmprestimos,
    carregarOcorrencias, limparOcorrencias,
    carregarResponsaveis, limparResponsaveis,
} from './index.js';
import { limparFiltrosHistorico } from './loanStore.js';
import { advanceSessionDataVersion, getSessionDataVersion } from './sessionDataVersion.js';
import { createSessionDataCoordinator } from './sessionDataCoordinator.js';
import { iniciarLiveSync } from './liveSync.js';
import { showToast } from '../ui/index.js';
import { t } from './i18nStore.js';
import { falharCargasPendentes } from './loadStatus.js';

const coordinator = createSessionDataCoordinator({
    nextVersion: advanceSessionDataVersion,
    getVersion: getSessionDataVersion,
    isCurrent: (version) => version === getSessionDataVersion(),
    checkReady: () => http.get('/ready'),
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
let ultimaChave: string | undefined;

function chaveDaSessao(autenticado: boolean, usuarioId: unknown): string {
    return autenticado ? `u:${String(usuarioId ?? '')}` : 'guest';
}

export async function initAuthDataSync(): Promise<void> {
    if (!unsubscribeAuth) {
        unsubscribeAuth = subscribe(({ autenticado, usuario }) => {
            // Profile-only updates (same auth state and user id) must not clear stores nor reload data.
            const chave = chaveDaSessao(autenticado, usuario?.id);
            if (chave === ultimaChave) return;
            ultimaChave = chave;
            // Busca/filtros do histórico não podem sobreviver ao usuário que os digitou (PC compartilhado).
            void limparFiltrosHistorico({ recarregar: false });
            void synchronize(autenticado);
        });
    }
    ultimaChave = chaveDaSessao(isAutenticado(), getUsuario()?.id);
    const cargaInicial = synchronize(isAutenticado());
    // A sincronização ao vivo começa junto com a carga inicial: o cursor é obtido em paralelo, antes das listas.
    iniciarLiveSync();
    await cargaInicial;
}

async function synchronize(authenticated: boolean): Promise<void> {
    try {
        await coordinator.sync(authenticated);
    } catch (error) {
        console.error('[eduAssets] Falha ao sincronizar dados da sessão:', error);
        // Listas sem dados passam a mostrar o estado de erro no próprio painel (com "Tentar novamente").
        falharCargasPendentes();
        const erroPrincipal = error instanceof AggregateError
            ? error.errors.find((item): item is Error => item instanceof Error)
            : error;
        const mensagem = erroPrincipal instanceof Error && erroPrincipal.message
            ? erroPrincipal.message
            : t('feedback.erro_carregar_dados_iniciais');
        showToast(mensagem, 'error');
    }
}
