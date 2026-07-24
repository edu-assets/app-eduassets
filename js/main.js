import { initNavigation, initMobileNavigation } from './core/layout/index.js';
import { initModals, initConfirm } from './core/ui/index.js';
import { initDashboard } from './features/dashboard/dashboard.js';
import { initControle } from './features/controle/controle.js';
import { initCadastros } from './features/cadastros/cadastros.js';
import { initEmprestimo } from './features/emprestimo/emprestimo.js';
import { initDevolucao } from './features/devolucao/devolucao.js';
import { initExportar } from './features/exportar/exportar.js';
import { initConfig } from './features/config/config.js';
import { carregarEquipamentos, carregarEmprestimos, carregarOcorrencias, carregarResponsaveis } from './core/state/index.js';

document.addEventListener('DOMContentLoaded', async () => {
    const cargasIniciais = await Promise.allSettled([
        carregarEquipamentos(),
        carregarResponsaveis(),
        carregarEmprestimos(),
        carregarOcorrencias()
    ]);

    cargasIniciais.forEach((resultado, indice) => {
        if (resultado.status === 'rejected') {
            const origem = ['equipamentos', 'responsáveis', 'empréstimos', 'ocorrências'][indice];
            console.error(`[eduAssets] Fail to load ${origem}:`, resultado.reason);
        }
    });

    const inits = [
        initNavigation,
        initMobileNavigation,
        initModals,
        initConfirm,
        initDashboard,
        initControle,
        initCadastros,
        initEmprestimo,
        initDevolucao,
        initExportar,
        initConfig
    ];

    inits.forEach((fn) => {
        try {
            fn();
        } catch (err) {
            console.error(`[eduAssets] Fail to initialize "${fn.name}":`, err);
        }
    });
});