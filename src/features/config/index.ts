import { attachConfigEvents, attachTemaToggle, attachIdiomaToggle } from './events.js';
import { initNotificacoesConfig } from './notificacoes.js';
import { initSessaoConfig } from './sessao.js';

export function initConfig(): void {
    attachConfigEvents();

    const grupoTema = document.getElementById('config-tema-group');
    if (grupoTema) attachTemaToggle(grupoTema);

    const grupoIdioma = document.getElementById('config-idioma-group');
    if (grupoIdioma) attachIdiomaToggle(grupoIdioma);

    initNotificacoesConfig();
    initSessaoConfig();
}
