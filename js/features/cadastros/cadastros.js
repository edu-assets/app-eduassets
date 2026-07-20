import { openModal, closeModal } from '../../core/modal/modal.js';

export function initCadastros() {
    const cards = document.querySelectorAll('.cadastro-card');
    const modal = document.getElementById('modal-cadastro');
    if (!cards.length || !modal) return;

    const titulo = document.getElementById('cadastro-modal-title');
    const camposWrap = document.getElementById('cadastro-modal-fields');
    const listaWrap = document.getElementById('cadastro-modal-list');
    const btnCancelar = document.getElementById('cadastro-modal-cancelar');
    const btnSalvar = document.getElementById('cadastro-modal-salvar');

    const config = {
        equipamentos: {
            titulo: 'Equipamentos',
            campos: [
                { id: 'cad-categoria', label: 'Categoria', type: 'text', placeholder: 'Ex: Notebook' },
                { id: 'cad-modelo', label: 'Modelo', type: 'text', placeholder: 'Ex: Multilaser' },
                { id: 'cad-quantidade', label: 'Quantidade', type: 'number', placeholder: '1' }
            ]
        },
        responsaveis: {
            titulo: 'Responsáveis',
            campos: [
                { id: 'cad-nome', label: 'Nome', type: 'text', placeholder: 'Nome completo' },
                { id: 'cad-cargo', label: 'Cargo', type: 'text', placeholder: 'Ex: Professor' }
            ]
        },
        usuarios: {
            titulo: 'Usuários do Sistema',
            campos: [
                { id: 'cad-nome-usuario', label: 'Nome', type: 'text', placeholder: 'Nome completo' },
                { id: 'cad-login-usuario', label: 'E-mail / Login', type: 'text', placeholder: 'usuario@escola.com' },
                { id: 'cad-nivel-acesso', label: 'Nível de acesso', type: 'select', options: ['Administrador', 'Editor'] }
            ]
        },
        categorias: {
            titulo: 'Categorias de Equipamentos',
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

    function abrirModal(tipo) {
        const dados = config[tipo];
        if (!dados) return;

        titulo.textContent = dados.titulo;

        camposWrap.innerHTML = dados.campos.map((campo) => {
            if (campo.type === 'select') {
                const opcoes = campo.options.map((op) => `<option value="${op}">${op}</option>`).join('');
                return `
                <div class="form-group">
                    <label for="${campo.id}">${campo.label}</label>
                    <select id="${campo.id}">
                        <option value="" disabled selected hidden>Selecionar</option>
                        ${opcoes}
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
        }).join('');

        listaWrap.innerHTML = `<div class="cadastro-modal-empty">Nenhum registro cadastrado.</div>`;

        openModal('modal-cadastro');
    }

    if (btnCancelar) btnCancelar.addEventListener('click', () => closeModal('modal-cadastro'));
    if (btnSalvar) btnSalvar.addEventListener('click', () => closeModal('modal-cadastro'));
}