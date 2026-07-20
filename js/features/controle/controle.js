import { openModal, closeModal } from '../../core/modal/modal.js';
import { showToast } from '../../core/toast/toast.js';
import { confirmarExclusao } from '../../core/confirm/confirm.js';
import { html, raw } from '../../core/utils/html.js';

const PROBLEMA_ICONS = {
    tela: { label: 'Tela', icon: 'monitor' },
    audio: { label: 'Áudio', icon: 'headphones' },
    bateria: { label: 'Bateria', icon: 'battery_alert' },
    cabo: { label: 'Cabo', icon: 'cable' },
    touch: { label: 'Touch', icon: 'touch_app' },
    teclado: { label: 'Teclado', icon: 'keyboard' },
    botao: { label: 'Botão', icon: 'smart_button' },
    carcaca: { label: 'Carcaça', icon: 'construction' },
    outro: { label: 'Outro', icon: 'help' }
};

const ICONE_POR_TIPO = {
    observacao: 'chat_bubble',
    manutencao: 'build',
    quebrado: 'heart_broken',
    resolvidos: 'task_alt'
};

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
        btnModalSalvar.addEventListener('click', () => {
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

            if (idEditando && linhaEditando) {
                editarRegistro(linhaEditando, tipoAtual, dados);
                showToast('Registro atualizado com sucesso', 'success');
            } else {
                adicionarRegistro(tipoAtual, dados);
                showToast('Registro criado com sucesso', 'success');
            }

            closeModal('modal-controle-novo');
            idEditando = null;
            linhaEditando = null;
        });
    }

    function renderMenuAcoes() {
        return html`
            <span class="registros-row-menu-wrap">
                <button type="button" class="registros-row-menu-btn" aria-label="Mais opções">
                    <span class="material-symbols-outlined">more_vert</span>
                </button>
                <div class="registros-row-menu">
                    <span class="registros-row-menu-opcao" data-acao="editar">Editar</span>
                    <span class="registros-row-menu-opcao registros-row-menu-opcao-danger" data-acao="excluir">Excluir</span>
                </div>
            </span>
        `;
    }

    function aplicarDadosNaLinha(row, dados) {
        row.dataset.problema = dados.problema;
        row.dataset.categoria = dados.categoria;
        row.dataset.modelo = dados.modelo;
        row.dataset.numero = dados.numero;
        row.dataset.descricao = dados.descricao;
        row.dataset.registradoEm = dados.registradoEm;
        if (dados.medidas !== undefined) row.dataset.medidas = dados.medidas;
    }

    function renderLinhaConteudo(tipo, dados) {
        const problemaInfo = PROBLEMA_ICONS[dados.problema] || PROBLEMA_ICONS.outro;
        const iconeLinha = ICONE_POR_TIPO[tipo] || 'chat_bubble';

        const colunaMedidas = tipo === 'resolvidos'
            ? html`<span data-col="medidas">${dados.medidas}</span>`
            : '';

        return html`
            <span class="registros-row-icon"><span class="material-symbols-outlined">${iconeLinha}</span></span>
            <span data-col="categoria">${dados.categoria}</span>
            <span data-col="modelo">${dados.modelo}</span>
            <span class="registros-numero" data-col="numero">${dados.numero}</span>
            <span class="controle-problema-badge"><span class="material-symbols-outlined">${problemaInfo.icon}</span>${problemaInfo.label}</span>
            <span data-col="descricao">${dados.descricao}</span>
            <span class="registros-data" data-col="registrado-em">${dados.registradoEm}</span>
            ${raw(colunaMedidas)}
            ${raw(renderMenuAcoes())}
        `;
    }

    function adicionarRegistro(tipo, dados) {
        const tabContent = document.getElementById(`tab-${tipo}`);
        if (!tabContent) return;

        const completos = { ...dados, registradoEm: formatarDataHoraAtual() };

        const row = document.createElement('div');
        row.className = tipo === 'resolvidos' ? 'registros-row registros-row-resolvidos' : 'registros-row';
        row.dataset.id = crypto.randomUUID();
        aplicarDadosNaLinha(row, completos);
        row.innerHTML = renderLinhaConteudo(tipo, completos);

        tabContent.appendChild(row);
        atualizarContagem(tipo);

        if (tabContent.classList.contains('active')) atualizarPaginacaoTexto(tabContent);
    }

    function editarRegistro(row, tipo, dados) {
        const completos = { ...dados, registradoEm: row.dataset.registradoEm };
        aplicarDadosNaLinha(row, completos);
        row.innerHTML = renderLinhaConteudo(tipo, completos);
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

        const tabContent = row.closest('.controle-tab-content');
        const tipo = tabContent ? tabContent.dataset.tipo : null;

        const confirmado = await confirmarExclusao({
            titulo: 'Excluir registro',
            mensagem: 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.'
        });
        if (!confirmado) return;

        if (row === linhaSelecionada) limparSelecao();
        row.remove();

        if (tipo) atualizarContagem(tipo);
        if (tabContent && tabContent.classList.contains('active')) atualizarPaginacaoTexto(tabContent);

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
    ['observacao', 'manutencao', 'quebrado'].forEach(atualizarContagem);
    atualizarPaginacaoTexto(document.getElementById('tab-observacao'));
}

function formatarDataHoraAtual() {
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR');
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${data} ${hora}`;
}