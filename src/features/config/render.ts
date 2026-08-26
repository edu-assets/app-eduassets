export type TemaPreferencia = 'light' | 'dark' | 'system';
export type IdiomaPreferencia = 'pt' | 'en';

export function marcarTemaAtivo(grupoTema: HTMLElement, tema: TemaPreferencia): void {
    grupoTema.querySelectorAll<HTMLElement>('.config-toggle-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tema === tema);
    });
}

export function marcarIdiomaAtivo(grupoIdioma: HTMLElement, idioma: IdiomaPreferencia): void {
    grupoIdioma.querySelectorAll<HTMLElement>('.config-toggle-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.idioma === idioma);
    });
}
