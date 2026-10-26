export type TemaPreferencia = 'light' | 'dark' | 'system';
export type IdiomaPreferencia = 'pt' | 'en';

export function marcarTemaAtivo(grupoTema: HTMLElement, tema: TemaPreferencia): void {
    grupoTema.querySelectorAll<HTMLElement>('[data-tema]').forEach((btn) => {
        const ativo = btn.dataset.tema === tema;
        btn.classList.toggle('active', ativo);
        btn.setAttribute('aria-pressed', String(ativo));
    });
}

export function marcarIdiomaAtivo(grupoIdioma: HTMLElement, idioma: IdiomaPreferencia): void {
    grupoIdioma.querySelectorAll<HTMLElement>('.config-toggle-btn').forEach((btn) => {
        const ativo = btn.dataset.idioma === idioma;
        btn.classList.toggle('active', ativo);
        btn.setAttribute('aria-pressed', String(ativo));
        if (ativo) btn.setAttribute('aria-current', 'true');
        else btn.removeAttribute('aria-current');
    });
}
