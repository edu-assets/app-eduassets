export function initMobileNavigation() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btnAbrir = document.getElementById('btn-mobile-menu');
    const btnFechar = document.getElementById('btn-sidebar-fechar');

    if (!sidebar || !btnAbrir) return;

    function abrirMenu() {
        sidebar.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
        btnAbrir.setAttribute('aria-expanded', 'true');
    }

    function fecharMenu() {
        sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
        btnAbrir.setAttribute('aria-expanded', 'false');
    }

    btnAbrir.addEventListener('click', abrirMenu);
    if (btnFechar) btnFechar.addEventListener('click', fecharMenu);
    if (backdrop) backdrop.addEventListener('click', fecharMenu);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) fecharMenu();
    });

    // fecha o menu ao navegar (senão o sidebar fica aberto cobrindo o painel escolhido)
    sidebar.querySelectorAll('.nav-link').forEach((link) => {
        sidebar.addEventListener('click', (e) => {
            if (e.target.closest('.nav-link') && sidebar.classList.contains('open')) fecharMenu();
        });
    });
}