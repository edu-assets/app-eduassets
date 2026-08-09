import { abrirPainelOverlay, fecharPainelOverlay } from '../../shared/dom/overlayPanel.js';

export function initMobileNavigation(): void {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btnAbrir = document.getElementById('btn-mobile-menu');
    const btnFechar = document.getElementById('btn-sidebar-fechar');

    if (!sidebar || !btnAbrir) return;

    const els = { painel: sidebar, backdrop };

    function abrirMenu(): void {
        abrirPainelOverlay(els, 'open', 'active');
        btnAbrir!.setAttribute('aria-expanded', 'true');
    }

    function fecharMenu(): void {
        fecharPainelOverlay(els, 'open', 'active');
        btnAbrir!.setAttribute('aria-expanded', 'false');
    }

    btnAbrir.addEventListener('click', abrirMenu);
    if (btnFechar) btnFechar.addEventListener('click', fecharMenu);
    if (backdrop) backdrop.addEventListener('click', fecharMenu);

    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) fecharMenu();
    });

    sidebar.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.nav-link') && sidebar.classList.contains('open')) fecharMenu();
    });
}