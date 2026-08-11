export function initNavigation(): void {
    const panels = document.querySelectorAll<HTMLElement>('.panel');

    document.addEventListener('click', (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const link = target.closest<HTMLElement>('.nav-link');
        if (!link) return;

        event.preventDefault();
        const targetId = link.dataset.panel;
        if (!targetId) return;

        ativarPanel(panels, targetId);
    });
}

function ativarPanel(panels: NodeListOf<HTMLElement>, targetId: string): void {
    const alvoExiste = document.getElementById(targetId) !== null;
    const idFinal = alvoExiste ? targetId : 'panel-404';

    panels.forEach((panel) => panel.classList.remove('active'));
    document.getElementById(idFinal)?.classList.add('active');

    document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll(`.nav-link[data-panel="${idFinal}"]`)
        .forEach((item) => item.classList.add('active'));
}