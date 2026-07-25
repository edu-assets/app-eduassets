import { openModal } from '../../core/ui/index.js';
import { getOcorrenciasPorTipo } from '../../core/state/ocorrenciasStore.js';
import { renderControleLinha, renderControleEmptyState } from './templates.js';

const TIPOS_VISIVEIS = ['observacao', 'manutencao', 'quebrado', 'resolvidos'];

const TITULOS_POR_TIPO = {
    observacao: 'Nova Observação',
    manutencao: 'Nova Manutenção',
    quebrado: 'Registrar Quebra',
    resolvidos: 'Editar Registro Resolvido'
};

export function renderControle(els, estado) {
    TIPOS_VISIVEIS.forEach((tipo) => {
        const tabContent = document.getElementById(`tab-${tipo}`);
        if (!tabContent) return;

        const header = tabContent.querySelector('.registros-header')?.outerHTML
            || tabContent.querySelector('.registros-header-resolvidos')?.outerHTML
            || '';

        const registros = getOcorrenciasPorTipo(tipo);
        const rows = registros.length
            ? registros.map((registro) => renderControleLinha(tipo, registro)).join('')
            : renderControleEmptyState();

        tabContent.innerHTML = header + rows;
    });

    TIPOS_VISIVEIS.slice(0, 3).forEach(atualizarContagem);
    atualizarPaginacaoTexto(els, document.querySelector('.controle-tab-content.active'));

    if (estado.linhaSelecionada) {
        const selecionadaAtual = buscarLinhaPorId(estado.linhaSelecionada.dataset.id);
        if (selecionadaAtual) {
            selecionarLinha(els, estado, selecionadaAtual);
        } else {
            limparSelecao(els, estado);
        }
    }
}

export function buscarLinhaPorId(id) {
    return document.querySelector(`.registros-row[data-id="${CSS.escape(String(id))}"]`);
}

export function atualizarContagem(tipo) {
    const contadorEl = document.getElementById(`contagem-${tipo}`);
    const tabContent = document.getElementById(`tab-${tipo}`);
    if (contadorEl && tabContent) {
        contadorEl.textContent = tabContent.querySelectorAll('.registros-row').length;
    }
}

export function atualizarPaginacaoTexto(els, tabContent) {
    if (!tabContent || !els.paginacaoTexto) return;
    const total = tabContent.querySelectorAll('.registros-row').length;
    els.paginacaoTexto.textContent = total > 0
        ? `Mostrando 1 a ${total} de ${total} registros`
        : 'Nenhum registro encontrado';
}

export function ativarAba(els, estado, tab) {
    document.querySelectorAll('.controle-tab-link').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.controle-tab-content').forEach((c) => c.classList.remove('active'));

    const tabLink = document.querySelector(`.controle-tab-link[data-controle-tab="${tab}"]`);
    const targetTab = document.getElementById(`tab-${tab}`);

    if (tabLink) tabLink.classList.add('active');
    if (targetTab) targetTab.classList.add('active');

    limparSelecao(els, estado);
    fecharTodosMenus();
    atualizarPaginacaoTexto(els, targetTab);
}

export function fecharTodosMenus(exceto = null) {
    document.querySelectorAll('.registros-row-menu.active').forEach((menu) => {
        if (menu !== exceto) menu.classList.remove('active');
    });
}

export function selecionarLinha(els, estado, row) {
    if (estado.linhaSelecionada) estado.linhaSelecionada.classList.remove('selected');
    estado.linhaSelecionada = row;
    row.classList.add('selected');
    atualizarToolbar(els, estado);
}

export function limparSelecao(els, estado) {
    if (estado.linhaSelecionada) estado.linhaSelecionada.classList.remove('selected');
    estado.linhaSelecionada = null;
    atualizarToolbar(els, estado);
}

export function atualizarToolbar(els, estado) {
    const temSelecao = estado.linhaSelecionada !== null;
    if (els.btnEditar) els.btnEditar.disabled = !temSelecao;
    if (els.btnDeletar) els.btnDeletar.disabled = !temSelecao;
}

function limparCamposModal(els) {
    [els.campoCategoria, els.campoModelo, els.campoNumero, els.campoDescricao, els.campoMedidas].forEach((campo) => {
        if (campo) campo.value = '';
    });
    if (els.campoProblema) els.campoProblema.value = '';
}

function alternarCampoMedidas(els, mostrar) {
    if (els.linhaMedidas) els.linhaMedidas.style.display = mostrar ? 'block' : 'none';
}

export function abrirNovoRegistro(els, estado, tipo) {
    estado.tipoAtual = tipo;
    estado.idEditando = null;
    estado.linhaEditando = null;

    if (els.modalTitle) els.modalTitle.textContent = TITULOS_POR_TIPO[tipo] || 'Novo Registro';
    limparCamposModal(els);
    alternarCampoMedidas(els, false);

    openModal('modal-controle-novo');
}

export function abrirEdicaoRegistro(els, estado, row) {
    const tabContent = row.closest('.controle-tab-content');
    const tipo = tabContent ? tabContent.dataset.tipo : null;
    if (!tipo) return;

    estado.tipoAtual = tipo;
    estado.idEditando = row.dataset.id;
    estado.linhaEditando = row;

    if (els.modalTitle) {
        els.modalTitle.textContent = tipo === 'resolvidos' ? 'Editar Registro Resolvido' : 'Editar Registro';
    }

    els.campoCategoria.value = row.dataset.categoria || '';
    els.campoModelo.value = row.dataset.modelo || '';
    els.campoNumero.value = row.dataset.numero || '';
    els.campoProblema.value = row.dataset.problema || '';
    els.campoDescricao.value = row.dataset.descricao || '';

    const ehResolvido = tipo === 'resolvidos';
    alternarCampoMedidas(els, ehResolvido);
    if (els.campoMedidas) els.campoMedidas.value = ehResolvido ? (row.dataset.medidas || '') : '';

    openModal('modal-controle-novo');
}