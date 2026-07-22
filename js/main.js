import { initNavigation } from './core/navigation/navigation.js';
import { initModals } from './core/modal/modal.js';
import { initDashboard } from './features/dashboard/dashboard.js';
import { initControle } from './features/controle/controle.js';
import { initCadastros } from './features/cadastros/cadastros.js';
import { initEmprestimo } from './features/emprestimo/emprestimo.js';
import { initDevolucao } from './features/devolucao/devolucao.js';
import { initExportar } from './features/exportar/exportar.js';
import { initConfig } from './features/config/config.js';
import { initConfirm } from './core/confirm/confirm.js';
import { initMobileNav } from './core/navigation/mobile-nav.js';

document.addEventListener('DOMContentLoaded', () => {
    const inits = [
        initNavigation,
        initMobileNav,
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
            console.error(`[eduAssets] Falha ao inicializar "${fn.name}":`, err);
        }
    });
});