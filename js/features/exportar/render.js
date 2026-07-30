import { renderOpcaoEquipamentoFiltro } from './templates.js';

export function definirEstadoCarregando(els, carregando) {
    els.btnSubmit.disabled = carregando;
    els.btnSubmit.textContent = carregando ? 'Gerando arquivo...' : els.textoOriginalBtn;
}

export function popularSelectEquipamentosFiltro(select, equipamentos) {
    select.innerHTML = equipamentos.map(renderOpcaoEquipamentoFiltro).join('');
}