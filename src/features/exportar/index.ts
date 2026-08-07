import { getEquipamentos, subscribe as subscribeEquipamentos } from '../../core/state/equipamentoStore.js';
import { attachExportarEvents } from './events.js';
import { atualizarResumo, definirPeriodoPadrao, popularChecklistEquipamentos } from './render.js';
import type { ExportarEls } from './render.js';

export function initExportar(): void {
    const form = document.getElementById('form-exportar') as HTMLFormElement | null;
    if (!form) return;

    const btnSubmit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!btnSubmit) return;

    const els: ExportarEls = {
        form,
        tipoDadosInput: document.getElementById('tipo-dados') as HTMLInputElement,
        tipoCards: document.querySelectorAll<HTMLElement>('.exportar-tipo-card'),
        periodoWrap: document.getElementById('exportar-periodo-wrap') as HTMLElement,
        periodoDesc: document.getElementById('exportar-periodo-desc') as HTMLElement,
        dataInicialInput: document.getElementById('data-inicial') as HTMLInputElement,
        dataFinalInput: document.getElementById('data-final') as HTMLInputElement,
        formatoInput: document.getElementById('exportar-formato') as HTMLInputElement,
        formatoBtns: document.querySelectorAll<HTMLElement>('.exportar-formato-btn'),
        observacaoInput: document.getElementById('exportar-observacao') as HTMLTextAreaElement | null,
        equipWrap: document.getElementById('exportar-equip-wrap') as HTMLElement,
        equipTodosCheckbox: document.getElementById('exportar-equip-todos') as HTMLInputElement,
        equipContagem: document.getElementById('exportar-equip-contagem') as HTMLElement,
        equipListaContainer: document.getElementById('exportar-equip-list') as HTMLElement,
        resumoTipo: document.getElementById('resumo-tipo') as HTMLElement,
        resumoPeriodo: document.getElementById('resumo-periodo') as HTMLElement,
        resumoFormato: document.getElementById('resumo-formato') as HTMLElement,
        btnSubmit,
        textoOriginalBtn: btnSubmit.innerHTML
    };

    definirPeriodoPadrao(els);
    popularChecklistEquipamentos(els, getEquipamentos());
    subscribeEquipamentos(() => popularChecklistEquipamentos(els, getEquipamentos()));

    attachExportarEvents(els);
    atualizarResumo(els);
}