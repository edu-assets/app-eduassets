import { getEquipamentos, subscribe as subscribeEquipamentos } from '../../core/state/equipamentoStore.js';
import { attachExportarEvents } from './events.js';
import { popularSelectEquipamentosFiltro } from './render.js';

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
        equipamentosSelect: document.getElementById('exportar-equipamentos'),
        observacaoInput: document.getElementById('exportar-observacao'),
        btnSubmit,
        textoOriginalBtn: btnSubmit.textContent
    };

    popularSelectEquipamentosFiltro(els.equipamentosSelect, getEquipamentos());
    subscribeEquipamentos(() => popularSelectEquipamentosFiltro(els.equipamentosSelect, getEquipamentos()));

    attachExportarEvents(els);
}