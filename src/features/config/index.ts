import { attachConfigEvents, attachTemaToggle, attachIdiomaToggle } from './events.js';

export function initConfig(): void {
    const btnSalvar = document.getElementById('config-salvar');
    if (!btnSalvar) return;

    attachConfigEvents(btnSalvar);

    const grupoTema = document.getElementById('config-tema-group');
    if (grupoTema) attachTemaToggle(grupoTema);

    const grupoIdioma = document.getElementById('config-idioma-group');
    if (grupoIdioma) attachIdiomaToggle(grupoIdioma);
}
