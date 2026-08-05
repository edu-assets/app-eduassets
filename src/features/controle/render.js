import { openModal } from '../../core/ui/index.js';
import { getOcorrenciasPorTipo } from '../../core/state/ocorrenciasStore.js';
import { escapeHtml } from '../../core/utils/sanitize.js';
import { renderControleLinha, renderControleEmptyState, ICONE_POR_TIPO } from './templates.js';
import { listarCategoriasDisponiveis, listarModelosPorCategoria } from './service.js';

const TIPOS_VISIVEIS = ['observacao', 'manutencao', 'quebrado', 'resolvidos'];

const TITULOS_POR_TIPO = {
    observacao: 'Nova Observação',
    manutencao: 'Nova Manutenção',
    quebrado: 'Registrar Quebra',
    resolvidos: 'Editar Registro Resolvido'
};

const SUBTITULOS_POR_TIPO = {
    observacao: 'Registre uma ocorrência para acompanhamento.',
    manutencao: 'Registre um equipamento que precisa de manutenção.',
    quebrado: 'Registre um equipamento quebrado ou danificado.',
    resolvidos: 'Atualize as informações deste registro resolvido.'
};

const COR_ICONE_POR_TIPO = {
    observacao: 'info',
    manutencao: 'warning',
    quebrado: 'error',
    resolvidos: 'success'
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
    const tipoSelecionado = estado.linhaSelecionada?.closest('.controle-tab-content')?.dataset.tipo;
    const podeResolver = temSelecao && (tipoSelecionado === 'manutencao' || tipoSelecionado === 'quebrado');

    if (els.btnEditar) els.btnEditar.disabled = !temSelecao;
    if (els.btnDeletar) els.btnDeletar.disabled = !temSelecao;
    if (els.btnResolver) els.btnResolver.disabled = !podeResolver;
}

export function popularSelectCategorias(els) {
    const categorias = listarCategoriasDisponiveis();
    const placeholder = '<option value="" disabled selected hidden>Selecionar categoria</option>';
    els.campoCategoria.innerHTML = placeholder + categorias
        .map((categoria) => `<option value="${escapeHtml(categoria)}">${escapeHtml(categoria)}</option>`)
        .join('');
}

export function popularSelectModelos(els, categoriaNome) {
    const modelos = categoriaNome ? listarModelosPorCategoria(categoriaNome) : [];
    const placeholder = '<option value="" disabled selected hidden>Selecionar modelo</option>';
    els.campoModelo.innerHTML = placeholder + modelos
        .map((modelo) => `<option value="${escapeHtml(modelo)}">${escapeHtml(modelo)}</option>`)
        .join('');
}

function limparCamposModal(els) {
    [els.campoNumero, els.campoDescricao, els.campoMedidas].forEach((campo) => {
        if (campo) campo.value = '';
    });
    if (els.campoProblema) els.campoProblema.value = '';
}

function alternarCampoMedidas(els, mostrar) {
    if (els.linhaMedidas) els.linhaMedidas.style.display = mostrar ? 'block' : 'none';
}

function atualizarHeaderModal(els, tipo) {
    if (els.modalTitle) els.modalTitle.textContent = TITULOS_POR_TIPO[tipo] || 'Novo Registro';
    if (els.modalSubtitle) els.modalSubtitle.textContent = SUBTITULOS_POR_TIPO[tipo] || '';

    if (els.modalHeaderIcon) {
        const cor = COR_ICONE_POR_TIPO[tipo] || 'info';
        els.modalHeaderIcon.className = `modal-header-icon modal-header-icon-${cor}`;
    }
    if (els.modalHeaderIconSymbol) {
        els.modalHeaderIconSymbol.textContent = ICONE_POR_TIPO[tipo] || 'chat_bubble';
    }
}

export function abrirNovoRegistro(els, estado, tipo) {
    estado.tipoAtual = tipo;
    estado.idEditando = null;
    estado.linhaEditando = null;

    atualizarHeaderModal(els, tipo);

    popularSelectCategorias(els);
    popularSelectModelos(els, null);
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

    atualizarHeaderModal(els, tipo);
    if (els.modalTitle) {
        els.modalTitle.textContent = tipo === 'resolvidos' ? 'Editar Registro Resolvido' : 'Editar Registro';
    }

    popularSelectCategorias(els);
    els.campoCategoria.value = row.dataset.categoria || '';
    popularSelectModelos(els, row.dataset.categoria);
    els.campoModelo.value = row.dataset.modelo || '';
    els.campoNumero.value = row.dataset.numero || '';
    els.campoProblema.value = row.dataset.problema || '';
    els.campoDescricao.value = row.dataset.descricao || '';

    const ehResolvido = tipo === 'resolvidos';
    alternarCampoMedidas(els, ehResolvido);
    if (els.campoMedidas) els.campoMedidas.value = ehResolvido ? (row.dataset.medidas || '') : '';

    openModal('modal-controle-novo');
}

export function abrirResolverRegistro(els, estado, row) {
    const tabContent = row.closest('.controle-tab-content');
    const tipo = tabContent ? tabContent.dataset.tipo : null;
    if (tipo !== 'manutencao' && tipo !== 'quebrado') return;

    estado.idResolvendo = row.dataset.id;

    if (els.resolverCategoriaModelo) {
        els.resolverCategoriaModelo.textContent = `${row.dataset.categoria} — ${row.dataset.modelo}`;
    }
    if (els.resolverNumeroProblema) {
        els.resolverNumeroProblema.textContent = `Nº ${row.dataset.numero}`;
    }
    if (els.resolverDescricao) {
        els.resolverDescricao.textContent = row.dataset.descricao || '';
    }
    if (els.resolverMedidas) {
        els.resolverMedidas.value = '';
    }

    openModal('modal-controle-resolver');
}