export function initNavigation() {
    const panels = document.querySelectorAll('.panel');

    document.addEventListener('click', (event) => {
        const link = event.target.closest('.nav-link');
        if (!link) return;

        event.preventDefault();
        const targetId = link.dataset.panel;
        if (!targetId) return;

        panels.forEach((panel) => panel.classList.remove('active'));
        document.getElementById(targetId)?.classList.add('active');

        document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'));
        document.querySelectorAll(`.nav-link[data-panel="${targetId}"]`)
            .forEach((item) => item.classList.add('active'));
    });
}