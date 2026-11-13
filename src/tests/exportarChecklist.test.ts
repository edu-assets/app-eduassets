// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/state/i18nStore.js', () => ({ t: (key: string) => key, getIdioma: () => 'pt' }));

import { popularChecklistEquipamentos } from '../features/exportar/render.js';
import type { ExportarEls } from '../features/exportar/render.js';
import type { Equipamento } from '../types/index.js';

const equipamento = (id: number) => ({ id, modelo: `Modelo ${id}`, categoria: { nome: 'Cat' } }) as unknown as Equipamento;

function montar(): ExportarEls {
    document.body.innerHTML = `
        <input id="tipo" value="equipamentos"><input id="fmt" value="csv">
        <input id="ini"><input id="fim">
        <input type="checkbox" id="todos"><span id="cont"></span><span id="rt"></span><span id="rp"></span><span id="rf"></span>
        <div id="lista"></div>`;
    const el = (id: string) => document.getElementById(id) as HTMLElement;
    return {
        tipoDadosInput: el('tipo'), formatoInput: el('fmt'),
        dataInicialInput: el('ini'), dataFinalInput: el('fim'),
        equipTodosCheckbox: el('todos'), equipContagem: el('cont'), equipListaContainer: el('lista'),
        resumoTipo: el('rt'), resumoPeriodo: el('rp'), resumoFormato: el('rf')
    } as unknown as ExportarEls;
}

describe('popularChecklistEquipamentos', () => {
    let els: ExportarEls;

    beforeEach(() => { els = montar(); });

    const marcados = () => Array.from(els.equipListaContainer.querySelectorAll<HTMLInputElement>('.exportar-equip-checkbox'))
        .filter((cb) => cb.checked).map((cb) => cb.value);

    it('primeira renderizacao: todos marcados', () => {
        popularChecklistEquipamentos(els, [equipamento(1), equipamento(2)]);
        expect(marcados()).toEqual(['1', '2']);
    });

    it('re-renderizar (atualizacao ao vivo) preserva o que o usuario desmarcou e marca os novos', () => {
        popularChecklistEquipamentos(els, [equipamento(1), equipamento(2), equipamento(3)]);
        (els.equipListaContainer.querySelector('input[value="2"]') as HTMLInputElement).checked = false;

        popularChecklistEquipamentos(els, [equipamento(1), equipamento(2), equipamento(3), equipamento(4)]);

        expect(marcados()).toEqual(['1', '3', '4']);
    });
});
