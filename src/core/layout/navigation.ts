export function initNavigation(): void {
    const panels = document.querySelectorAll<HTMLElement>('.panel');

    document.addEventListener('click', (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const link = target.closest<HTMLElement>('.nav-link');
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