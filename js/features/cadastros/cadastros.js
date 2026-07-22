import { openModal, closeModal } from '../../core/modal/modal.js';
import { showToast } from '../../core/toast/toast.js';
import { escapeHtml } from '../../core/utils/sanitize.js';
import {
    categoriasApi,
    equipamentosApi,
    responsaveisApi,
    usuariosApi,
    ApiError
} from '../../core/api/index.js';

export function initCadastros() {
    const cards = document.querySelectorAll('.cadastro-card');
    const modal = document.getElementById('modal-cadastro');
    if (!cards.length || !modal) return;

    const titulo = document.getElementById('cadastro-modal-title');
    const camposWrap = document.getElementById('cadastro-modal-fields');
    const listaWrap = document.getElementById('cadastro-modal-list');
    const btnCancelar = document.getElementById('cadastro-modal-cancelar');
    const btnSalvar = document.getElementById('cadastro-modal-salvar');

    let tipoAtual = null;

    const config = {
        equipamentos: {
            titulo: 'Equipamentos',
            listar: () => equipamentosApi.listarEquipamentos(),
            criar: (valores) => equipamentosApi.criarEquipamento({
                categoriaId: Number(valores['cad-categoria']),
                modelo: valores['cad-modelo'],
                quantidadeTotal: Number(valores['cad-quantidade'])
            }),
            renderItem: (item) => `${item.categoria?.nome ?? '—'} — ${item.modelo} (${item.quantidadeDisponivel}/${item.quantidadeTotal})`,
            campos: [
                {
                    id: 'cad-categoria',
                    label: 'Categoria',
                    type: 'select',
                    carregarOpcoes: () => categoriasApi.listarCategorias()
                        .then((categorias) => categorias.map((c) => ({ value: c.id, label: c.nome })))
                },
                { id: 'cad-modelo', label: 'Modelo', type: 'text', placeholder: 'Ex: Multilaser' },
                { id: 'cad-quantidade', label: 'Quantidade', type: 'number', placeholder: '1' }
            ]
        },
        responsaveis: {
            titulo: 'Responsáveis',
            listar: () => responsaveisApi.listarResponsaveis(),
            criar: (valores) => responsaveisApi.criarResponsavel({
                nome: valores['cad-nome'],
                cargo: valores['cad-cargo']
            }),
            renderItem: (item) => `${item.nome} — ${item.cargo}`,
            campos: [
                { id: 'cad-nome', label: 'Nome', type: 'text', placeholder: 'Nome completo' },
                { id: 'cad-cargo', label: 'Cargo', type: 'text', placeholder: 'Ex: Professor' }
            ]
        },
        usuarios: {
            titulo: 'Usuários do Sistema',
            listar: () => usuariosApi.listarUsuarios(),
            criar: (valores) => usuariosApi.criarUsuario({
                nome: valores['cad-nome-usuario'],
                login: valores['cad-login-usuario'],
                nivelAcesso: valores['cad-nivel-acesso']
            }),
            renderItem: (item) => `${item.nome} — ${item.login} · ${item.nivelAcesso === 'ADMINISTRADOR' ? 'Administrador' : 'Editor'}`,
            campos: [
                { id: 'cad-nome-usuario', label: 'Nome', type: 'text', placeholder: 'Nome completo' },
                { id: 'cad-login-usuario', label: 'E-mail / Login', type: 'text', placeholder: 'usuario@escola.com' },
                {
                    id: 'cad-nivel-acesso',
                    label: 'Nível de acesso',
                    type: 'select',
                    options: [
                        { value: 'ADMINISTRADOR', label: 'Administrador' },
                        { value: 'EDITOR', label: 'Editor' }
                    ]
                }
            ]
        },
        categorias: {
            titulo: 'Categorias de Equipamentos',
            listar: () => categoriasApi.listarCategorias(),
            criar: (valores) => categoriasApi.criarCategoria(valores['cad-nome-categoria']),
            renderItem: (item) => item.nome,
            campos: [
                { id: 'cad-nome-categoria', label: 'Nome da Categoria', type: 'text', placeholder: 'Ex: Notebook' }
            ]
        }
    };

    cards.forEach((card) => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            abrirModal(card.dataset.cadastro);
        });
    });

    async function montarCamposHtml(campos) {
        const partes = await Promise.all(campos.map(async (campo) => {
            if (campo.type === 'select') {
                const opcoesBrutas = campo.carregarOpcoes
                    ? await campo.carregarOpcoes()
                    : campo.options;

                const opcoes = opcoesBrutas.map((op) => (typeof op === 'object' ? op : { value: op, label: op }));

                const opcoesHtml = opcoes
                    .map((op) => `<option value="${escapeHtml(String(op.value))}">${escapeHtml(op.label)}</option>`)
                    .join('');

                return `
                    <div class="form-group">
                        <label for="${campo.id}">${campo.label}</label>
                        <select id="${campo.id}">
                            <option value="" disabled selected hidden>Selecionar</option>
                            ${opcoesHtml}
                        </select>
                    </div>
                `;
            }

            return `
                <div class="form-group">
                    <label for="${campo.id}">${campo.label}</label>
                    <input type="${campo.type}" id="${campo.id}" placeholder="${campo.placeholder || ''}">
                </div>
            `;
        }));

        return partes.join('');
    }

    async function abrirModal(tipo) {
        const dados = config[tipo];
        if (!dados) return;

        tipoAtual = tipo;
        titulo.textContent = dados.titulo;

        try {
            camposWrap.innerHTML = await montarCamposHtml(dados.campos);
        } catch (erro) {
            showToast('Não foi possível carregar os dados do formulário.', 'error');
            return;
        }

        openModal('modal-cadastro');
        await carregarLista();
    }

    async function carregarLista() {
        const dados = config[tipoAtual];
        if (!dados) return;

        listaWrap.innerHTML = `<div class="cadastro-modal-empty">Carregando...</div>`;

        try {
            const itens = await dados.listar();
            renderLista(itens, dados);
        } catch (erro) {
            listaWrap.innerHTML = `<div class="cadastro-modal-empty">Não foi possível carregar os registros.</div>`;
            showToast(erro instanceof ApiError ? erro.message : 'Erro ao carregar registros.', 'error');
        }
    }

    function renderLista(itens, dados) {
        if (!itens.length) {
            listaWrap.innerHTML = `<div class="cadastro-modal-empty">Nenhum registro cadastrado.</div>`;
            return;
        }

        listaWrap.innerHTML = itens
            .map((item) => `<div class="cadastro-modal-item">${escapeHtml(dados.renderItem(item))}</div>`)
            .join('');
    }

    function limparCampos(campos) {
        campos.forEach((campo) => {
            const el = document.getElementById(campo.id);
            if (el) el.value = '';
        });
    }

    if (btnCancelar) btnCancelar.addEventListener('click', () => closeModal('modal-cadastro'));

    if (btnSalvar) {
        btnSalvar.addEventListener('click', async () => {
            const dados = config[tipoAtual];
            if (!dados) return;

            const valores = {};
            dados.campos.forEach((campo) => {
                const el = document.getElementById(campo.id);
                valores[campo.id] = el ? el.value.trim() : '';
            });

            const temCampoVazio = dados.campos.some((campo) => !valores[campo.id]);
            if (temCampoVazio) {
                showToast('Preencha todos os campos antes de salvar.', 'warning');
                return;
            }

            btnSalvar.disabled = true;
            try {
                await dados.criar(valores);
                showToast('Registro criado com sucesso', 'success');
                limparCampos(dados.campos);
                await carregarLista();
            } catch (erro) {
                showToast(erro instanceof ApiError ? erro.message : 'Erro ao salvar registro.', 'error');
            } finally {
                btnSalvar.disabled = false;
            }
        });
    }
}