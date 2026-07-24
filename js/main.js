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
import { carregarEquipamentos } from './core/state/equipamentoStore.js';
import { carregarResponsaveis } from './core/state/responsavelStore.js';
import { showToast } from './core/toast/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([carregarEquipamentos(), carregarResponsaveis()]);
    } catch (erro) {
        showToast('Não foi possível carregar dados iniciais da API. Verifique se o backend está rodando.', 'error');
    }

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
            console.error(`[eduAssets] Fail to initialize "${fn.name}":`, err);
        }
    });
});