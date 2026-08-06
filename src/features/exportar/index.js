import { getEquipamentos, subscribe as subscribeEquipamentos } from '../../core/state/equipamentoStore.js';
import { attachExportarEvents } from './events.js';
import { atualizarResumo, definirPeriodoPadrao, popularChecklistEquipamentos } from './render.js';

export function initExportar() {
    const form = document.getElementById('form-exportar');
    if (!form) return;

    const btnSubmit = form.querySelector('button[type="submit"]');

    const els = {
        form,
        tipoDadosInput: document.getElementById('tipo-dados'),
        tipoCards: document.querySelectorAll('.exportar-tipo-card'),
        periodoWrap: document.getElementById('exportar-periodo-wrap'),
        periodoDesc: document.getElementById('exportar-periodo-desc'),
        dataInicialInput: document.getElementById('data-inicial'),
        dataFinalInput: document.getElementById('data-final'),
        formatoInput: document.getElementById('exportar-formato'),
        formatoBtns: document.querySelectorAll('.exportar-formato-btn'),
        observacaoInput: document.getElementById('exportar-observacao'),
        equipWrap: document.getElementById('exportar-equip-wrap'),
        equipTodosCheckbox: document.getElementById('exportar-equip-todos'),
        equipContagem: document.getElementById('exportar-equip-contagem'),
        equipListaContainer: document.getElementById('exportar-equip-list'),
        resumoTipo: document.getElementById('resumo-tipo'),
        resumoPeriodo: document.getElementById('resumo-periodo'),
        resumoFormato: document.getElementById('resumo-formato'),
        btnSubmit,
        textoOriginalBtn: btnSubmit.innerHTML
    };

    definirPeriodoPadrao(els);
    popularChecklistEquipamentos(els, getEquipamentos());
    subscribeEquipamentos(() => popularChecklistEquipamentos(els, getEquipamentos()));

    attachExportarEvents(els);
    atualizarResumo(els);
}