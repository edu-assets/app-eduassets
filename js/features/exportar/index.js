import { attachExportarEvents } from './events.js';

export function initExportar() {
    const form = document.getElementById('form-exportar');
    if (!form) return;

    const btnSubmit = form.querySelector('button[type="submit"]');

    const els = {
        form,
        tipoDadosSelect: document.getElementById('tipo-dados'),
        dataInicialInput: document.getElementById('data-inicial'),
        dataFinalInput: document.getElementById('data-final'),
        formatoSelect: document.getElementById('exportar-formato'),
        btnSubmit,
        textoOriginalBtn: btnSubmit.textContent
    };

    attachExportarEvents(els);
}