export function initMobileNav() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btnAbrir = document.getElementById('btn-mobile-menu');
    const btnFechar = document.getElementById('btn-sidebar-fechar');

    if (!sidebar || !backdrop || !btnAbrir) return;

    function abrirMenu() {
        sidebar.classList.add('open');
        backdrop.classList.add('active');
        btnAbrir.setAttribute('aria-expanded', 'true');
    }

    function fecharMenu() {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
        btnAbrir.setAttribute('aria-expanded', 'false');
    }

    btnAbrir.addEventListener('click', () => {
        sidebar.classList.contains('open') ? fecharMenu() : abrirMenu();
    });

    if (btnFechar) btnFechar.addEventListener('click', fecharMenu);

    backdrop.addEventListener('click', fecharMenu);

    sidebar.querySelectorAll('.nav-link').forEach((link) => {
        link.addEventListener('click', fecharMenu);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) fecharMenu();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) fecharMenu();
    });
}