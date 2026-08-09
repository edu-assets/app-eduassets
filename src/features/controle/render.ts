import { openModal } from '../../core/ui/index.js';
import { getOcorrenciasPorTipo } from '../../core/state/ocorrenciasStore.js';
import { renderControleLinha, renderControleEmptyState, ICONE_POR_TIPO } from './templates.js';
import { listarCategoriasDisponiveis,filtrarOcorrencias, listarEquipamentosPorCategoria } from './service.js';
import { fillSelect, renderPlaceholderOption  } from '../../shared/dom/fillSelect.js';
import { renderOpcoesSelect } from '../../shared/components/selectOptions.js';

const TIPOS_VISIVEIS = ['observacao', 'manutencao', 'quebrado', 'resolvidos'];

const TITULOS_POR_TIPO: Record<string, string> = {
    observacao: 'Nova Observação',
    manutencao: 'Nova Manutenção',
    quebrado: 'Registrar Quebra',
    resolvidos: 'Editar Registro Resolvido'
};

const SUBTITULOS_POR_TIPO: Record<string, string> = {
    observacao: 'Registre uma ocorrência para acompanhamento.',
    manutencao: 'Registre um equipamento que precisa de manutenção.',
    quebrado: 'Registre um equipamento quebrado ou danificado.',
    resolvidos: 'Atualize as informações deste registro resolvido.'
};

const COR_ICONE_POR_TIPO: Record<string, string> = {
    observacao: 'info',
    manutencao: 'warning',
    quebrado: 'error',
    resolvidos: 'success'
};

export interface ControleEls {
    registrosContainer: HTMLElement;
    btnNovo: HTMLElement | null;
    menuNovo: HTMLElement | null;
    btnResolver: HTMLButtonElement | null;
    btnEditar: HTMLButtonElement | null;
    btnDeletar: HTMLButtonElement | null;
    paginacaoTexto: HTMLElement | null;
    modalTitle: HTMLElement | null;
    modalSubtitle: HTMLElement | null;
    modalHeaderIcon: HTMLElement | null;
    modalHeaderIconSymbol: HTMLElement | null;
    campoCategoria: HTMLSelectElement;
    campoModelo: HTMLSelectElement;
    campoNumero: HTMLInputElement;
    campoProblema: HTMLSelectElement;
    campoDescricao: HTMLTextAreaElement;
    linhaMedidas: HTMLElement | null;
    campoMedidas: HTMLTextAreaElement | null;
    btnModalCancelar: HTMLElement | null;
    btnModalSalvar: HTMLElement | null;
    resolverCategoriaModelo: HTMLElement | null;
    resolverNumeroProblema: HTMLElement | null;
    resolverDescricao: HTMLElement | null;
    resolverMedidas: HTMLTextAreaElement | null;
    btnResolverCancelar: HTMLElement | null;
    btnResolverConfirmar: HTMLElement | null;
    inputBusca: HTMLInputElement | null;
}

export interface ControleEstado {
    linhaSelecionada: HTMLElement | null;
    tipoAtual: string | null;
    idEditando: string | null;
    linhaEditando: HTMLElement | null;
    idResolvendo: string | null;
    termoBusca: string;
}

export function renderControle(els: ControleEls, estado: ControleEstado): void {
    TIPOS_VISIVEIS.forEach((tipo) => {
        const tabContent = document.getElementById(`tab-${tipo}`);
        if (!tabContent) return;

        const header = tabContent.querySelector('.registros-header')?.outerHTML
            || tabContent.querySelector('.registros-header-resolvidos')?.outerHTML
            || '';

        const registros = getOcorrenciasPorTipo(tipo);
        // NOVO: Aplica o filtro antes de renderizar
        const registrosFiltrados = filtrarOcorrencias(registros, estado.termoBusca);
        
        const rows = registrosFiltrados.length
            ? registrosFiltrados.map((registro) => renderControleLinha(tipo, registro)).join('')
            : renderControleEmptyState();

        tabContent.innerHTML = header + rows;
    });

    TIPOS_VISIVEIS.slice(0, 3).forEach(atualizarContagem);
    atualizarPaginacaoTexto(els, document.querySelector<HTMLElement>('.controle-tab-content.active'));

    if (estado.linhaSelecionada) {
        const selecionadaAtual = buscarLinhaPorId(estado.linhaSelecionada.dataset.id ?? '');
        if (selecionadaAtual) {
            selecionarLinha(els, estado, selecionadaAtual);
        } else {
            limparSelecao(els, estado);
        }
    }
}

export function buscarLinhaPorId(id: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`.registros-row[data-id="${CSS.escape(String(id))}"]`);
}

export function atualizarContagem(tipo: string): void {
    const contadorEl = document.getElementById(`contagem-${tipo}`);
    const tabContent = document.getElementById(`tab-${tipo}`);
    if (contadorEl && tabContent) {
        contadorEl.textContent = String(tabContent.querySelectorAll('.registros-row').length);
    }
}

export function atualizarPaginacaoTexto(els: ControleEls, tabContent: HTMLElement | null): void {
    if (!tabContent || !els.paginacaoTexto) return;
    const total = tabContent.querySelectorAll('.registros-row').length;
    els.paginacaoTexto.textContent = total > 0
        ? `Mostrando 1 a ${total} de ${total} registros`
        : 'Nenhum registro encontrado';
}

export function ativarAba(els: ControleEls, estado: ControleEstado, tab: string): void {
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

export function fecharTodosMenus(exceto: Element | null = null): void {
    document.querySelectorAll('.registros-row-menu.active').forEach((menu) => {
        if (menu !== exceto) menu.classList.remove('active');
    });
}

export function selecionarLinha(els: ControleEls, estado: ControleEstado, row: HTMLElement): void {
    if (estado.linhaSelecionada) estado.linhaSelecionada.classList.remove('selected');
    estado.linhaSelecionada = row;
    row.classList.add('selected');
    atualizarToolbar(els, estado);
}

export function limparSelecao(els: ControleEls, estado: ControleEstado): void {
    if (estado.linhaSelecionada) estado.linhaSelecionada.classList.remove('selected');
    estado.linhaSelecionada = null;
    atualizarToolbar(els, estado);
}

export function atualizarToolbar(els: ControleEls, estado: ControleEstado): void {
    const temSelecao = estado.linhaSelecionada !== null;
    const tipoSelecionado = estado.linhaSelecionada?.closest<HTMLElement>('.controle-tab-content')?.dataset.tipo;
    const podeResolver = temSelecao && (tipoSelecionado === 'manutencao' || tipoSelecionado === 'quebrado');

    if (els.btnEditar) els.btnEditar.disabled = !temSelecao;
    if (els.btnDeletar) els.btnDeletar.disabled = !temSelecao;
    if (els.btnResolver) els.btnResolver.disabled = !podeResolver;
}

export function popularSelectCategorias(els: ControleEls): void {
    const categorias = listarCategoriasDisponiveis();
    const opcoes = categorias.map((c) => ({ id: c, label: c }));
    fillSelect(els.campoCategoria, renderPlaceholderOption('Selecionar categoria'), renderOpcoesSelect(opcoes));
}

export function popularSelectModelos(els: ControleEls, categoriaNome: string | null): void {
    const equipamentos = listarEquipamentosPorCategoria(categoriaNome);
    const opcoes = equipamentos.map((eq) => ({ id: eq.id, label: eq.modelo }));
    fillSelect(els.campoModelo, renderPlaceholderOption('Selecionar modelo'), renderOpcoesSelect(opcoes));
}

function limparCamposModal(els: ControleEls): void {
    [els.campoNumero, els.campoDescricao, els.campoMedidas].forEach((campo) => {
        if (campo) campo.value = '';
    });
    if (els.campoProblema) els.campoProblema.value = '';
}

function alternarCampoMedidas(els: ControleEls, mostrar: boolean): void {
    if (els.linhaMedidas) els.linhaMedidas.style.display = mostrar ? 'block' : 'none';
}

function atualizarHeaderModal(els: ControleEls, tipo: string): void {
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

export function abrirNovoRegistro(els: ControleEls, estado: ControleEstado, tipo: string): void {
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

export function abrirEdicaoRegistro(els: ControleEls, estado: ControleEstado, row: HTMLElement): void {
    const tabContent = row.closest<HTMLElement>('.controle-tab-content');
    const tipo = tabContent ? tabContent.dataset.tipo : null;
    if (!tipo) return;

    estado.tipoAtual = tipo;
    estado.idEditando = row.dataset.id ?? null;
    estado.linhaEditando = row;

    atualizarHeaderModal(els, tipo);
    if (els.modalTitle) {
        els.modalTitle.textContent = tipo === 'resolvidos' ? 'Editar Registro Resolvido' : 'Editar Registro';
    }

    popularSelectCategorias(els);
    els.campoCategoria.value = row.dataset.categoria || '';
    popularSelectModelos(els, row.dataset.categoria ?? null);
    els.campoModelo.value = row.dataset.equipamentoId || '';
    els.campoNumero.value = row.dataset.numero || '';
    els.campoProblema.value = row.dataset.problema || '';
    els.campoDescricao.value = row.dataset.descricao || '';

    const ehResolvido = tipo === 'resolvidos';
    alternarCampoMedidas(els, ehResolvido);
    if (els.campoMedidas) els.campoMedidas.value = ehResolvido ? (row.dataset.medidas || '') : '';

    openModal('modal-controle-novo');
}

export function abrirResolverRegistro(els: ControleEls, estado: ControleEstado, row: HTMLElement): void {
    const tabContent = row.closest<HTMLElement>('.controle-tab-content');
    const tipo = tabContent ? tabContent.dataset.tipo : null;
    if (tipo !== 'manutencao' && tipo !== 'quebrado') return;

    estado.idResolvendo = row.dataset.id ?? null;

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