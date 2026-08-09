export type TemaPreferencia = 'light' | 'dark' | 'system';

export function marcarTemaAtivo(grupoTema: HTMLElement, tema: TemaPreferencia): void {
    grupoTema.querySelectorAll<HTMLElement>('.config-toggle-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tema === tema);
    });
}