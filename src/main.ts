import { initNavigation, initMobileNavigation } from './core/layout/index.js';
import { initModals, initConfirm } from './core/ui/index.js';
import { initTheme } from './core/state/themeStore.js';
import { initSessionTimeout } from './core/auth/sessionTimeout.js';
import { initDashboard } from './features/dashboard/index.js';
import { initControle } from './features/controle/index.js';
import { initCadastros } from './features/cadastros/index.js';
import { initEmprestimo } from './features/emprestimo/index.js';
import { initDevolucao } from './features/devolucao/index.js';
import { initExportar } from './features/exportar/index.js';
import { initConfig } from './features/config/index.js';
import { carregarEquipamentos, carregarEmprestimos, carregarOcorrencias, carregarResponsaveis } from './core/state/index.js';
import { initAuth } from './features/auth/index.js';
import { initSeguranca } from './features/seguranca/index.js';
import { initPerfil } from './features/perfil/index.js';

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    const [_, ...cargasIniciais] = await Promise.allSettled([initAuth(), carregarEquipamentos(), carregarResponsaveis(), carregarEmprestimos(), carregarOcorrencias()]);

    cargasIniciais.forEach((resultado, indice) => {
        if (resultado.status === 'rejected') {
            const origem = ['equipamentos', 'responsáveis', 'empréstimos', 'ocorrências'][indice];
            console.error(`[eduAssets] Fail to load ${origem}:`, resultado.reason);
        }
    });

    const inits: Array<() => void> = [
        initNavigation,
        initMobileNavigation,
        initModals,
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
        initPerfil
    ];

    inits.forEach((fn) => {
        try {
            fn();
        } catch (err) {
            console.error(`[eduAssets] Fail to initialize "${fn.name}":`, err);
        }
    });
});