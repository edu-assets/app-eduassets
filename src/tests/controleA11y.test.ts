// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const adicionarRegistro = vi.fn();

vi.mock('../features/controle/service.js', () => ({
    adicionarRegistro: (...args: unknown[]) => adicionarRegistro(...args),
    editarRegistro: vi.fn(),
    removerRegistro: vi.fn(),
    resolverRegistro: vi.fn(),
    listarCategoriasDisponiveis: () => ['Notebook'],
    listarEquipamentosPorCategoria: () => [{ id: 1, modelo: 'Dell' }],
    filtrarOcorrencias: (lista: unknown[]) => lista
}));
const abrirDocumentacao = vi.fn();
vi.mock('../features/sobre/index.js', () => ({ abrirDocumentacao: (...a: unknown[]) => abrirDocumentacao(...a) }));
vi.mock('../core/auth/guestGate.js', () => ({
    bloquearSeConvidado: () => false,
    bloquearSeNaoAdmin: () => false
}));
vi.mock('../core/ui/index.js', () => ({
    closeModal: vi.fn(),
    openModal: vi.fn(),
    showToast: vi.fn(),
    confirmarExclusao: vi.fn()
}));

const HTML = `
<div class="controle-registros-container">
  <button id="btn-novo-registro" type="button" aria-haspopup="menu" aria-expanded="false">Novo</button>
  <div id="novo-registro-menu" class="novo-registro-menu" role="menu">
    <button type="button" role="menuitem" class="novo-registro-opcao" data-tipo="observacao">Obs</button>
    <button type="button" role="menuitem" class="novo-registro-opcao" data-tipo="quebrado">Quebrado</button>
  </div>
  <div class="controle-tabs" role="tablist">
    <button type="button" role="tab" class="controle-tab-link active" aria-selected="true" tabindex="0" data-controle-tab="observacao">A</button>
    <button type="button" role="tab" class="controle-tab-link" aria-selected="false" tabindex="-1" data-controle-tab="manutencao">B</button>
    <button type="button" role="tab" class="controle-tab-link" aria-selected="false" tabindex="-1" data-controle-tab="quebrado">C</button>
  </div>
  <div id="tab-observacao" class="controle-tab-content active"></div>
  <div id="tab-manutencao" class="controle-tab-content"></div>
  <div id="tab-quebrado" class="controle-tab-content"></div>
  <button id="controle-btn-saiba-mais" type="button">Saiba mais</button>
  <div id="registros"></div>
  <div class="form-group"><select id="cat" required><option value=""></option><option value="Notebook">Notebook</option></select></div>
  <div class="form-group"><select id="mod" required><option value=""></option><option value="1">Dell</option></select></div>
  <div class="form-group"><input id="num" required></div>
  <div class="form-group"><select id="prob" required><option value=""></option><option value="tela">Tela</option></select></div>
  <textarea id="desc"></textarea>
  <button id="salvar" type="button">Salvar</button>
</div>`;

function el<T extends HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
}

function preencher(): void {
    el<HTMLSelectElement>('cat').value = 'Notebook';
    el<HTMLSelectElement>('mod').value = '1';
    el<HTMLInputElement>('num').value = 'NB-1';
    el<HTMLSelectElement>('prob').value = 'tela';
}

describe('controle: acessibilidade e anti duplo clique', () => {
    const estado = {
        linhaSelecionada: null, tipoAtual: 'observacao' as string | null, idEditando: null,
        linhaEditando: null, idResolvendo: null, termoBusca: ''
    };

    beforeAll(async () => {
        document.body.innerHTML = HTML;
        const { attachControleEvents } = await import('../features/controle/events.js');
        const els = {
            registrosContainer: el('registros'),
            btnNovo: el('btn-novo-registro'),
            menuNovo: el('novo-registro-menu'),
            btnResolver: null, btnEditar: null, btnDeletar: null, paginacaoTexto: null,
            modalTitle: null, modalSubtitle: null, modalHeaderIcon: null, modalHeaderIconSymbol: null,
            campoCategoria: el('cat'), campoModelo: el('mod'), campoNumero: el('num'),
            campoProblema: el('prob'), campoDescricao: el('desc'),
            linhaMedidas: null, campoMedidas: null, btnModalCancelar: null,
            btnModalSalvar: el('salvar'),
            resolverCategoriaModelo: null, resolverNumeroProblema: null, resolverDescricao: null,
            resolverMedidas: null, btnResolverCancelar: null, btnResolverConfirmar: null, inputBusca: null
        };
        attachControleEvents(els as never, estado as never);
    });

    beforeEach(() => {
        adicionarRegistro.mockReset();
        estado.tipoAtual = 'observacao';
    });

    it('double click on save sends a single request', async () => {
        let liberar: () => void = () => {};
        adicionarRegistro.mockReturnValue(new Promise<void>((r) => { liberar = r; }));
        preencher();

        el('salvar').click();
        el('salvar').click();
        expect(adicionarRegistro).toHaveBeenCalledTimes(1);
        expect((el('salvar') as HTMLButtonElement).disabled).toBe(true);

        liberar();
        await vi.waitFor(() => expect((el('salvar') as HTMLButtonElement).disabled).toBe(false));
    });

    it('Saiba mais opens the user manual', () => {
        abrirDocumentacao.mockClear();
        el('controle-btn-saiba-mais').click();
        expect(abrirDocumentacao).toHaveBeenCalledWith('manual-usuario');
    });

    it('shows inline errors, focuses the first invalid field and clears on input', () => {
        el<HTMLSelectElement>('cat').value = '';
        el<HTMLSelectElement>('mod').value = '';
        el<HTMLInputElement>('num').value = '';
        el<HTMLSelectElement>('prob').value = '';

        el('salvar').click();

        expect(adicionarRegistro).not.toHaveBeenCalled();
        const num = el<HTMLInputElement>('num');
        expect(num.getAttribute('aria-invalid')).toBe('true');
        expect(document.getElementById(num.getAttribute('aria-describedby')!)?.textContent).toBeTruthy();
        expect(document.activeElement).toBe(el('cat'));

        num.value = 'x';
        num.dispatchEvent(new Event('input', { bubbles: true }));
        expect(num.hasAttribute('aria-invalid')).toBe(false);
        expect(document.getElementById('num-erro')).toBeNull();
    });

    it('tabs: arrows, Home and End move focus and selection (roving tabindex)', () => {
        const tabs = Array.from(document.querySelectorAll<HTMLElement>('.controle-tab-link'));
        tabs[0].focus();
        const key = (k: string): void => {
            (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
        };

        key('ArrowRight');
        expect(document.activeElement).toBe(tabs[1]);
        expect(tabs[1].getAttribute('aria-selected')).toBe('true');
        expect(tabs[1].tabIndex).toBe(0);
        expect(tabs[0].tabIndex).toBe(-1);

        key('End');
        expect(document.activeElement).toBe(tabs[2]);
        key('ArrowRight');
        expect(document.activeElement).toBe(tabs[0]);
        key('ArrowLeft');
        expect(document.activeElement).toBe(tabs[2]);
        key('Home');
        expect(document.activeElement).toBe(tabs[0]);
    });

    it('Novo menu: opens with aria-expanded and Esc closes it returning focus to the trigger', () => {
        const trigger = el('btn-novo-registro');
        const menu = el('novo-registro-menu');

        trigger.click();
        expect(menu.classList.contains('active')).toBe(true);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement).toBe(menu.querySelector('[role="menuitem"]'));

        document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(menu.classList.contains('active')).toBe(false);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(trigger);
    });
});
