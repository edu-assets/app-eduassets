import { attachConfigEvents, attachTemaToggle } from './events.js';

export function initConfig(): void {
    const btnSalvar = document.getElementById('config-salvar');
    if (!btnSalvar) return;

    attachConfigEvents(btnSalvar);

    const grupoTema = document.getElementById('config-tema-group');
    if (grupoTema) attachTemaToggle(grupoTema);
}