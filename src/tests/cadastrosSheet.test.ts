// @vitest-environment jsdom
import indexHtml from '../../index.html?raw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Categoria, Equipamento, Responsavel, Usuario } from '../types/index.js';

const mocks = vi.hoisted(() => ({
    listarRegistros: vi.fn(),
    atualizarUsuario: vi.fn(),
    ajustarTotalEquipamento: vi.fn(),
    renomearCategoria: vi.fn(),
    atualizarResponsavel: vi.fn(),
    redefinirSenhaUsuario: vi.fn(),
    showToast: vi.fn(),
    confirmarExclusao: vi.fn()
}));

vi.mock('../features/cadastros/service.js', async (importOriginal) => {
    const original = await importOriginal<typeof import('../features/cadastros/service.js')>();
    return {
        ...original,
        listarRegistros: mocks.listarRegistros,
        carregarOpcoesCampo: async () => [{ value: '1', label: 'Notebook' }],
        atualizarUsuario: mocks.atualizarUsuario,
        ajustarTotalEquipamento: mocks.ajustarTotalEquipamento,
        renomearCategoria: mocks.renomearCategoria,
        atualizarResponsavel: mocks.atualizarResponsavel,
        redefinirSenhaUsuario: mocks.redefinirSenhaUsuario
    };
});
vi.mock('../core/ui/index.js', async (importOriginal) => {
    const original = await importOriginal<typeof import('../core/ui/index.js')>();
    return { ...original, showToast: mocks.showToast, confirmarExclusao: mocks.confirmarExclusao };
});
vi.mock('../core/auth/guestGate.js', () => ({ bloquearSeNaoAdmin: () => false, bloquearSeConvidado: () => false }));
vi.mock('../core/state/authStore.js', async (importOriginal) => {
    const original = await importOriginal<typeof import('../core/state/authStore.js')>();
    return { ...original, getUsuario: () => ({ id: 99, nome: 'Admin', login: 'admin@x.com', nivelAcesso: 'ADMINISTRADOR' }) };
});
vi.mock('../core/state/equipamentoStore.js', () => ({
    getEquipamentos: () => [],
    carregarEquipamentos: async () => undefined,
    atualizarEquipamentoPorId: () => undefined
}));
vi.mock('../core/state/responsavelStore.js', () => ({ carregarResponsaveis: async () => undefined }));

import { initCadastros } from '../features/cadastros/index.js';
import { closeModal } from '../core/ui/index.js';
import { t } from '../core/state/i18nStore.js';
import { criarSheetCadastro, manterCampoVisivel } from '../features/cadastros/sheet.js';

/** Real markup of the three Cadastros modals, straight from index.html. */
function markupModais(): string {
    const inicio = indexHtml.indexOf('<div class="modal-overlay" id="modal-cadastro">');
    const fim = indexHtml.indexOf('<div class="cadastros-container">');
    expect(inicio).toBeGreaterThan(-1);
    expect(fim).toBeGreaterThan(inicio);
    return indexHtml.slice(inicio, fim);
}

const flush = async (): Promise<void> => {
    for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0));
};

const usuarios: Usuario[] = [
    { id: 1, nome: 'Ana Souza', login: 'ana.souza.com.um.login.bem.comprido@escola.exemplo.com', nivelAcesso: 'EDITOR', createdAt: '', possuiCartaoRfid: false },
    { id: 2, nome: 'Bruno Lima', login: 'bruno@escola.com', nivelAcesso: 'EDITOR', createdAt: '', possuiCartaoRfid: true }
];
const equipamentos = [
    { id: 7, categoriaId: 1, categoria: { id: 1, nome: 'Notebook' }, modelo: 'Dell', quantidadeTotal: 10, quantidadeDisponivel: 8, quantidadeQuebrada: 0, createdAt: '', updatedAt: '' }
] as unknown as Equipamento[];
const categorias: Categoria[] = [{ id: 3, nome: 'Notebook' }, { id: 4, nome: 'Projetor' }];
const responsaveis: Responsavel[] = [{ id: 5, nome: 'Carla', cargo: 'Professora', ativo: true }];

const DADOS: Record<string, unknown[]> = { usuarios, equipamentos, categorias, responsaveis };

function el<T extends HTMLElement = HTMLElement>(seletor: string): T {
    const encontrado = document.querySelector<T>(seletor);
    if (!encontrado) throw new Error(`missing ${seletor}`);
    return encontrado;
}

async function abrir(tipo: string): Promise<void> {
    el(`.cadastro-card[data-cadastro="${tipo}"]`).click();
    await flush();
}

function modaisAtivos(): string[] {
    return Array.from(document.querySelectorAll('.modal-overlay.active')).map((m) => m.id);
}

function emDetalhe(): boolean {
    return !el('#cadastro-modal-detalhe').hidden;
}

let iniciado = false;

beforeEach(async () => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.listarRegistros.mockImplementation(async (tipo: string) => DADOS[tipo] ?? []);
    mocks.atualizarUsuario.mockResolvedValue({});
    mocks.ajustarTotalEquipamento.mockResolvedValue({});
    mocks.renomearCategoria.mockResolvedValue({});
    mocks.atualizarResponsavel.mockResolvedValue({});
    mocks.redefinirSenhaUsuario.mockResolvedValue(undefined);

    if (!iniciado) {
        document.body.innerHTML = `
            ${markupModais()}
            <a href="#" class="cadastro-card" data-cadastro="equipamentos"></a>
            <a href="#" class="cadastro-card" data-cadastro="categorias"></a>
            <a href="#" class="cadastro-card" data-cadastro="responsaveis"></a>
            <a href="#" class="cadastro-card" data-cadastro="usuarios"></a>`;
        initCadastros();
        iniciado = true;
    } else {
        closeModal('modal-cadastro');
        await flush();
    }
});

describe('Cadastros sheet: edit replaces the list (no nested modal, no inner scroll)', () => {
    it('Usuários: Editar opens a detail view in the same modal, Voltar restores search, scroll and focus', async () => {
        await abrir('usuarios');
        const busca = el<HTMLInputElement>('#cadastro-modal-busca');
        busca.value = 'ana';
        busca.dispatchEvent(new Event('input'));
        expect(el('#cadastro-modal-list').querySelectorAll('.cadastro-usuario-row')).toHaveLength(1);

        const box = el('#modal-cadastro .modal-box');
        box.scrollTop = 120;
        el('[data-editar-usuario-id="1"]').click();

        expect(emDetalhe()).toBe(true);
        expect(el('#modal-cadastro .modal-body').hidden).toBe(true);
        expect(el('#modal-cadastro .modal-header').hidden).toBe(true);
        expect(el('#cadastro-detalhe-titulo').textContent).toBe(t('cadastros.editar_usuario'));
        expect(el('#cadastro-modal-detalhe [data-editar-usuario-form="1"]')).toBeTruthy();
        expect(el('#cadastro-modal-list').querySelector('form')).toBeNull();
        expect(document.activeElement?.id).toBe('edit-usuario-nome');
        expect(box.getAttribute('aria-labelledby')).toBe('cadastro-detalhe-titulo');
        expect(modaisAtivos()).toEqual(['modal-cadastro']);

        el('#cadastro-modal-detalhe .cadastro-detalhe-voltar').click();
        expect(emDetalhe()).toBe(false);
        expect(el('#modal-cadastro .modal-body').hidden).toBe(false);
        expect(busca.value).toBe('ana');
        expect(el('#cadastro-modal-list').querySelectorAll('.cadastro-usuario-row')).toHaveLength(1);
        expect(box.scrollTop).toBe(120);
        expect((document.activeElement as HTMLElement).dataset.editarUsuarioId).toBe('1');
    });

    it('Usuários: saving keeps inline validation, then returns to the list and refreshes it silently', async () => {
        await abrir('usuarios');
        el('[data-editar-usuario-id="1"]').click();
        const nome = el<HTMLInputElement>('#edit-usuario-nome');
        nome.value = '  ';
        el<HTMLFormElement>('#cadastro-edicao-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        await flush();
        expect(emDetalhe()).toBe(true);
        expect(el('#edit-usuario-nome-erro').hidden).toBe(false);
        expect(mocks.atualizarUsuario).not.toHaveBeenCalled();

        nome.value = 'Ana Maria';
        el<HTMLFormElement>('#cadastro-edicao-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        await flush();
        expect(mocks.atualizarUsuario).toHaveBeenCalledWith(1, { nome: 'Ana Maria' });
        expect(emDetalhe()).toBe(false);
        expect(el('#cadastro-modal-list').textContent).not.toContain('Carregando');
    });

    it('Usuários: the pinned footer submit button belongs to the edit form', async () => {
        await abrir('usuarios');
        el('[data-editar-usuario-id="2"]').click();
        const salvar = el<HTMLButtonElement>('#cadastro-detalhe-footer [data-edicao-salvar]');
        expect(salvar.form?.id).toBe('cadastro-edicao-form');
        el('#cadastro-detalhe-footer [data-edicao-voltar]').click();
        expect(emDetalhe()).toBe(false);
    });

    it('Usuários: Redefinir senha is hosted in the sheet instead of stacking a second modal', async () => {
        await abrir('usuarios');
        const formOriginalPai = el('#reset-senha-form').parentElement;
        el('[data-reset-senha-usuario-id="1"]').click();

        expect(emDetalhe()).toBe(true);
        expect(modaisAtivos()).toEqual(['modal-cadastro']);
        expect(el('#cadastro-modal-detalhe #reset-senha-form')).toBeTruthy();
        expect(el('#cadastro-detalhe-footer #reset-senha-salvar')).toBeTruthy();
        expect(el('#reset-senha-nome').textContent).toBe('Ana Souza');
        expect(document.activeElement?.id).toBe('reset-senha-nova');

        el<HTMLInputElement>('#reset-senha-nova').value = 'Temporaria#2026';
        el('#reset-senha-cancelar').click();
        expect(emDetalhe()).toBe(false);
        expect(el('#reset-senha-form').parentElement).toBe(formOriginalPai);
        expect(el<HTMLInputElement>('#reset-senha-nova').value).toBe('');
    });

    it('Usuários: Cartão RFID is hosted in the sheet too', async () => {
        await abrir('usuarios');
        el('[data-rfid-usuario-id="2"]').click();
        expect(emDetalhe()).toBe(true);
        expect(modaisAtivos()).toEqual(['modal-cadastro']);
        expect(el('#cadastro-modal-detalhe #btn-rfid-revogar')).toBeTruthy();
        el('#cadastro-modal-detalhe .cadastro-detalhe-voltar').click();
        expect(el('#modal-cadastro-rfid #btn-rfid-revogar')).toBeTruthy();
    });

    it('Equipamentos: Ajustar total opens its own view; unchanged value just goes back', async () => {
        await abrir('equipamentos');
        el('[data-ajustar-total-id="7"]').click();
        expect(emDetalhe()).toBe(true);
        expect(el('#cadastro-detalhe-titulo').textContent).toBe(t('cadastros.ajustar_total'));
        expect(el('#cadastro-detalhe-subtitulo').textContent).toContain('Dell');
        const campo = el<HTMLInputElement>('#ajuste-total-valor');
        campo.value = '1';
        el<HTMLFormElement>('#cadastro-edicao-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        await flush();
        expect(el('#ajuste-total-valor-erro').hidden).toBe(false);
        expect(emDetalhe()).toBe(true);

        campo.value = '10';
        el<HTMLFormElement>('#cadastro-edicao-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        await flush();
        expect(mocks.ajustarTotalEquipamento).not.toHaveBeenCalled();
        expect(emDetalhe()).toBe(false);
    });

    it('Categorias: rename errors stay inline in the detail view', async () => {
        await abrir('categorias');
        mocks.renomearCategoria.mockRejectedValueOnce(new Error('Já existe uma categoria com esse nome.'));
        el('[data-renomear-categoria-id="3"]').click();
        expect(el('#cadastro-detalhe-titulo').textContent).toBe(t('cadastros.renomear_categoria'));
        el<HTMLInputElement>('#edit-categoria-nome').value = 'Projetor';
        el<HTMLFormElement>('#cadastro-edicao-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        await flush();
        expect(emDetalhe()).toBe(true);
        expect(el('#edit-categoria-nome-erro').hidden).toBe(false);
    });

    it('Responsáveis: Escape steps back to the list instead of closing the modal', async () => {
        await abrir('responsaveis');
        el('[data-editar-responsavel-id="5"]').click();
        expect(el('#cadastro-detalhe-titulo').textContent).toBe(t('cadastros.editar_responsavel'));
        el('#edit-responsavel-nome').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(emDetalhe()).toBe(false);
        expect(modaisAtivos()).toEqual(['modal-cadastro']);
    });

    it('closing the modal while editing resets to the list view', async () => {
        await abrir('responsaveis');
        el('[data-editar-responsavel-id="5"]').click();
        closeModal('modal-cadastro');
        await flush();
        expect(emDetalhe()).toBe(false);
        expect(el('#cadastro-detalhe-body').innerHTML).toBe('');
    });

    it('list rows no longer embed edit forms and the list has no inner scroll class', async () => {
        await abrir('usuarios');
        expect(el('#cadastro-modal-list').querySelector('form, input')).toBeNull();
        expect(el('#modal-cadastro .modal-box').classList.contains('cadastro-sheet')).toBe(true);
    });
});

describe('sheet helpers', () => {
    it('criarSheetCadastro returns null without a modal box', () => {
        const div = document.createElement('div');
        expect(criarSheetCadastro(div)).toBeNull();
    });

    it('manterCampoVisivel centers the focused field after the keyboard opens', () => {
        vi.useFakeTimers();
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        const spy = vi.fn();
        input.scrollIntoView = spy;
        manterCampoVisivel(input, 300);
        expect(spy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(300);
        expect(spy).toHaveBeenCalledWith({ block: 'center', inline: 'nearest' });
        vi.useRealTimers();
        input.remove();
    });
});
