import { openModal, closeModal, showToast, confirmarExclusao } from '../../core/ui/index.js';
import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { getOcorrenciasPorTipo, subscribe as subscribeOcorrencias, addOcorrencia, updateOcorrencia, deleteOcorrencia } from '../../core/state/ocorrenciasStore.js';
import { renderControleLinha } from './controleTemplates.js';

const TITULOS_POR_TIPO = {
    observacao: 'Nova Observação',
    manutencao: 'Nova Manutenção',
    quebrado: 'Registrar Quebra',
    resolvidos: 'Editar Registro Resolvido'
};

export function initControle() {
    const registrosContainer = document.querySelector('.controle-registros-container');
    if (!registrosContainer) return;

    const btnNovo = document.getElementById('btn-novo-registro');
    const menuNovo = document.getElementById('novo-registro-menu');
    const btnEditar = document.getElementById('btn-editar-registro');
    const btnDeletar = document.getElementById('btn-deletar-registro');
    const paginacaoTexto = document.getElementById('controle-paginacao-texto');

    const tiposVisiveis = ['observacao', 'manutencao', 'quebrado', 'resolvidos'];

    let linhaSelecionada = null;
    let tipoAtual = null;
    let idEditando = null;
    let linhaEditando = null;

    /* ===== Tabs: Observação | Manutenção | Quebrado | Resolvidos ===== */
    document.querySelectorAll('.controle-tab-link').forEach((tabLink) => {
        tabLink.addEventListener('click', () => ativarAba(tabLink.dataset.controleTab));
    });

    document.querySelectorAll('.controle-resumo-card').forEach((card) => {
        card.addEventListener('click', () => ativarAba(card.dataset.controleTab));
    });

    function ativarAba(tab) {
        document.querySelectorAll('.controle-tab-link').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.controle-tab-content').forEach(c => c.classList.remove('active'));

        const tabLink = document.querySelector(`.controle-tab-link[data-controle-tab="${tab}"]`);
        const targetTab = document.getElementById(`tab-${tab}`);

        if (tabLink) tabLink.classList.add('active');
        if (targetTab) targetTab.classList.add('active');

        limparSelecao();
        fecharTodosMenus();
        atualizarPaginacaoTexto(targetTab);
    }

    function atualizarPaginacaoTexto(tabContent) {
        if (!tabContent || !paginacaoTexto) return;
        const total = tabContent.querySelectorAll('.registros-row').length;
        paginacaoTexto.textContent = total > 0
            ? `Mostrando 1 a ${total} de ${total} registros`
            : 'Nenhum registro encontrado';
    }

    /* ===== Dropdown "+Novo" ===== */
    if (btnNovo && menuNovo) {
        btnNovo.addEventListener('click', (e) => {
            e.stopPropagation();
            menuNovo.classList.toggle('active');
        });

        menuNovo.querySelectorAll('.novo-registro-opcao').forEach((opcao) => {
            opcao.addEventListener('click', () => {
                const tipo = opcao.dataset.tipo;
                menuNovo.classList.remove('active');
                abrirNovoRegistro(tipo);
            });
        });
    }

    document.addEventListener('click', (e) => {
        if (menuNovo && !menuNovo.contains(e.target) && e.target !== btnNovo) {
            menuNovo.classList.remove('active');
        }
        fecharTodosMenus(e.target);
    });

    /* ===== Modal: novo registro / edição ===== */
    const modalTitle = document.getElementById('controle-modal-title');
    const campoCategoria = document.getElementById('controle-modal-categoria');
    const campoModelo = document.getElementById('controle-modal-modelo');
    const campoNumero = document.getElementById('controle-modal-numero');
    const campoProblema = document.getElementById('controle-modal-problema');
    const campoDescricao = document.getElementById('controle-modal-descricao');
    const linhaMedidas = document.getElementById('controle-modal-medidas-row');
    const campoMedidas = document.getElementById('controle-modal-medidas');
    const btnModalCancelar = document.getElementById('controle-modal-cancelar');
    const btnModalSalvar = document.getElementById('controle-modal-salvar');

    function limparCampos() {
        [campoCategoria, campoModelo, campoNumero, campoDescricao, campoMedidas].forEach((campo) => {
            if (campo) campo.value = '';
        });
        if (campoProblema) campoProblema.value = '';
    }

    function alternarCampoMedidas(mostrar) {
        if (linhaMedidas) linhaMedidas.style.display = mostrar ? 'block' : 'none';
    }

    function abrirNovoRegistro(tipo) {
        tipoAtual = tipo;
        idEditando = null;
        linhaEditando = null;

        if (modalTitle) modalTitle.textContent = TITULOS_POR_TIPO[tipo] || 'Novo Registro';
        limparCampos();
        alternarCampoMedidas(false);

        openModal('modal-controle-novo');
    }

    function abrirEdicaoRegistro(row) {
        const tabContent = row.closest('.controle-tab-content');
        const tipo = tabContent ? tabContent.dataset.tipo : null;
        if (!tipo) return;

        tipoAtual = tipo;
        idEditando = row.dataset.id;
        linhaEditando = row;

        if (modalTitle) modalTitle.textContent = tipo === 'resolvidos' ? 'Editar Registro Resolvido' : 'Editar Registro';

        campoCategoria.value = row.dataset.categoria || '';
        campoModelo.value = row.dataset.modelo || '';
        campoNumero.value = row.dataset.numero || '';
        campoProblema.value = row.dataset.problema || '';
        campoDescricao.value = row.dataset.descricao || '';

        const ehResolvido = tipo === 'resolvidos';
        alternarCampoMedidas(ehResolvido);
        if (campoMedidas) campoMedidas.value = ehResolvido ? (row.dataset.medidas || '') : '';

        openModal('modal-controle-novo');
    }

    if (btnModalCancelar) {
        btnModalCancelar.addEventListener('click', () => {
            idEditando = null;
            linhaEditando = null;
            closeModal('modal-controle-novo');
        });
    }

    if (btnModalSalvar) {
        btnModalSalvar.addEventListener('click', async () => {
            if (!tipoAtual) return;

            if (!campoCategoria.value || !campoModelo.value || !campoNumero.value || !campoProblema.value) {
                campoProblema.reportValidity ? campoProblema.reportValidity() : null;
                return;
            }

            if (tipoAtual === 'resolvidos' && !campoMedidas.value.trim()) {
                showToast('Descreva as medidas tomadas antes de salvar', 'warning');
                campoMedidas.focus();
                return;
            }

            const dados = {
                categoria: campoCategoria.value,
                modelo: campoModelo.value,
                numero: campoNumero.value,
                problema: campoProblema.value,
                descricao: campoDescricao.value || '—',
                medidas: tipoAtual === 'resolvidos' ? campoMedidas.value : undefined
            };

            try {
                if (idEditando) {
                    await editarRegistro(idEditando, tipoAtual, dados);
                    showToast('Registro atualizado com sucesso', 'success');
                } else {
                    await adicionarRegistro(tipoAtual, dados);
                    showToast('Registro criado com sucesso', 'success');
                }
            } catch (erro) {
                showToast(erro instanceof Error ? erro.message : 'Erro ao salvar registro.', 'error');
                return;
            }

            closeModal('modal-controle-novo');
            idEditando = null;
            linhaEditando = null;
        });
    }

    function renderControle() {
        tiposVisiveis.forEach((tipo) => {
            const tabContent = document.getElementById(`tab-${tipo}`);
            if (!tabContent) return;

            const header = tabContent.querySelector('.registros-header')?.outerHTML
                || tabContent.querySelector('.registros-header-resolvidos')?.outerHTML
                || '';

            const registros = getOcorrenciasPorTipo(tipo);
            const rows = registros.length
                ? registros.map((registro) => renderControleLinha(tipo, registro)).join('')
                : `
                    <div class="devolucao-detalhe-empty" style="display:flex; min-height: 220px; align-items:center; justify-content:center; flex-direction:column; gap: 12px;">
                        <span class="material-symbols-outlined">inbox</span>
                        <p>Nenhum registro encontrado.</p>
                    </div>
                `;

            tabContent.innerHTML = header + rows;
        });

        tiposVisiveis.slice(0, 3).forEach(atualizarContagem);
        atualizarPaginacaoTexto(document.querySelector('.controle-tab-content.active'));

        if (linhaSelecionada) {
            const selecionadaAtual = registrosElementById(linhaSelecionada.dataset.id);
            if (selecionadaAtual) {
                selecionarLinha(selecionadaAtual);
            } else {
                limparSelecao();
            }
        }
    }

    function registrosElementById(id) {
        return document.querySelector(`.registros-row[data-id="${CSS.escape(String(id))}"]`);
    }

    async function adicionarRegistro(tipo, dados) {
        const equipamentoId = resolverEquipamentoId(dados.categoria, dados.modelo);
        if (!equipamentoId) {
            throw new Error('Não foi possível localizar um equipamento correspondente para salvar o registro.');
        }

        await addOcorrencia({
            equipamentoId,
            tipo: mapTipoApi(tipo),
            problema: dados.problema,
            descricao: dados.descricao,
            numeros: [dados.numero]
        });
    }

    async function editarRegistro(id, tipo, dados) {
        const payload = {
            problema: dados.problema,
            descricao: dados.descricao,
            numero: dados.numero
        };

        if (tipo === 'resolvidos' && dados.medidas !== undefined) {
            payload.medidasTomadas = dados.medidas;
        }

        await updateOcorrencia(Number(id), payload);
    }

    function atualizarContagem(tipo) {
        const contadorEl = document.getElementById(`contagem-${tipo}`);
        const tabContent = document.getElementById(`tab-${tipo}`);
        if (contadorEl && tabContent) {
            contadorEl.textContent = tabContent.querySelectorAll('.registros-row').length;
        }
    }

    /* ===== Seleção de linha + toolbar ===== */
    registrosContainer.addEventListener('click', (e) => {
        const menuBtn = e.target.closest('.registros-row-menu-btn');
        if (menuBtn) {
            e.stopPropagation();
            const menu = menuBtn.nextElementSibling;
            const jaAberto = menu.classList.contains('active');
            fecharTodosMenus();
            if (!jaAberto) menu.classList.add('active');
            return;
        }

        const opcaoMenu = e.target.closest('.registros-row-menu-opcao');
        if (opcaoMenu) {
            const row = opcaoMenu.closest('.registros-row');
            fecharTodosMenus();
            if (opcaoMenu.dataset.acao === 'excluir') {
                removerLinha(row);
            } else {
                selecionarLinha(row);
                abrirEdicaoRegistro(row);
            }
            return;
        }

        const row = e.target.closest('.registros-row');
        if (!row) return;

        if (linhaSelecionada === row) {
            limparSelecao();
            return;
        }

        selecionarLinha(row);
    });

    function fecharTodosMenus(exceto = null) {
        document.querySelectorAll('.registros-row-menu.active').forEach((menu) => {
            if (menu !== exceto) menu.classList.remove('active');
        });
    }

    function selecionarLinha(row) {
        if (linhaSelecionada) linhaSelecionada.classList.remove('selected');
        linhaSelecionada = row;
        row.classList.add('selected');
        atualizarToolbar();
    }

    function limparSelecao() {
        if (linhaSelecionada) linhaSelecionada.classList.remove('selected');
        linhaSelecionada = null;
        atualizarToolbar();
    }

    function atualizarToolbar() {
        const temSelecao = linhaSelecionada !== null;
        if (btnEditar) btnEditar.disabled = !temSelecao;
        if (btnDeletar) btnDeletar.disabled = !temSelecao;
    }
    async function removerLinha(row) {
        if (!row) return;

        const confirmado = await confirmarExclusao({
            titulo: 'Excluir registro',
            mensagem: 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.'
        });
        if (!confirmado) return;

        if (row === linhaSelecionada) limparSelecao();

        await deleteOcorrencia(Number(row.dataset.id));

        showToast('Registro excluído com sucesso', 'success');
    }

    if (btnEditar) {
        btnEditar.addEventListener('click', () => {
            if (!linhaSelecionada) return;
            abrirEdicaoRegistro(linhaSelecionada);
        });
    }

    if (btnDeletar) {
        btnDeletar.addEventListener('click', () => removerLinha(linhaSelecionada));
    }

    /* ===== Inicialização ===== */
    renderControle();
    subscribeOcorrencias(() => renderControle());
}

function resolverEquipamentoId(categoria, modelo) {
    const categoriaNormalizada = String(categoria || '').trim().toLowerCase();
    const modeloNormalizado = String(modelo || '').trim().toLowerCase();

    const equipamento = getEquipamentos().find((item) => {
        const categoriaItem = String(item.categoria?.nome ?? '').trim().toLowerCase();
        const modeloItem = String(item.modelo ?? '').trim().toLowerCase();
        return categoriaItem === categoriaNormalizada && modeloItem === modeloNormalizado;
    });

    return equipamento?.id ?? null;
}

function mapTipoApi(tipo) {
    const map = {
        observacao: 'OBSERVACAO',
        manutencao: 'MANUTENCAO',
        quebrado: 'QUEBRADO'
    };

    return map[tipo] || 'OBSERVACAO';
}
