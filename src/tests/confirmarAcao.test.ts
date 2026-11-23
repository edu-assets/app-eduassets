// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => localStorage.setItem('eduassets_lang', 'pt'));
import { initModals } from '../core/ui/modal.js';
import { initConfirm, confirmarAcao, confirmarExclusao } from '../core/ui/confirm.js';

const MODAL = `
<div class="modal-overlay" id="modal-confirmar-exclusao">
  <div class="modal-box modal-box--md">
    <div class="modal-header">
      <span class="modal-header-icon modal-header-icon-error" id="confirmar-exclusao-icone"><span class="material-symbols-outlined">delete</span></span>
      <div class="modal-header-titles"><h3 id="confirmar-exclusao-titulo"></h3><p id="confirmar-exclusao-mensagem"></p></div>
    </div>
    <div class="modal-body">
      <div id="confirmar-exclusao-detalhes" style="display:none"></div>
      <div id="confirmar-exclusao-conteudo" style="display:none"></div>
      <div class="modal-callout modal-callout-error" id="confirmar-exclusao-callout" style="display:none"><span id="confirmar-exclusao-callout-text"></span></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-neutral" id="confirmar-exclusao-cancelar" type="button">Cancelar</button>
      <button class="btn btn-danger" id="confirmar-exclusao-btn" type="button"><span class="material-symbols-outlined">delete</span> Excluir registro</button>
    </div>
  </div>
</div>`;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const aberto = (): boolean => $('modal-confirmar-exclusao').classList.contains('active');

beforeEach(() => {
    document.body.innerHTML = MODAL;
    // initModals/initConfirm registram listeners no overlay recém-criado; os de document acumulam, mas são idempotentes.
    initModals();
    initConfirm();
});

describe('confirmarExclusao (atalho)', () => {
    it('abre com a variante de erro, resolve true ao confirmar e fecha', async () => {
        const promessa = confirmarExclusao({ titulo: 'Excluir registro', mensagem: 'Esta ação não pode ser desfeita.', detalhesHtml: '<b id="d">x</b>', textoAtencao: 'Cuidado' });
        expect(aberto()).toBe(true);
        expect($('confirmar-exclusao-titulo').textContent).toBe('Excluir registro');
        expect($('confirmar-exclusao-icone').classList.contains('modal-header-icon-error')).toBe(true);
        expect($('confirmar-exclusao-btn').classList.contains('btn-danger')).toBe(true);
        expect($('confirmar-exclusao-btn').textContent).toContain('Excluir registro');
        expect($('confirmar-exclusao-detalhes').style.display).toBe('block');
        expect($('confirmar-exclusao-callout').style.display).toBe('flex');
        $('confirmar-exclusao-btn').click();
        await expect(promessa).resolves.toBe(true);
        expect(aberto()).toBe(false);
    });

    it('cancelar, fundo, Esc e o X do cabeçalho resolvem false', async () => {
        for (const fechar of [
            () => $('confirmar-exclusao-cancelar').click(),
            () => $('modal-confirmar-exclusao').click(),
            () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
            () => document.querySelector<HTMLElement>('#modal-confirmar-exclusao .modal-close-btn')!.click()
        ]) {
            const promessa = confirmarExclusao();
            fechar();
            await expect(promessa).resolves.toBe(false);
            expect(aberto()).toBe(false);
        }
    });

    it('sem o modal no DOM cai no window.confirm', async () => {
        document.body.innerHTML = '';
        const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
        await expect(confirmarExclusao({ mensagem: 'Certeza?' })).resolves.toBe(true);
        expect(confirmar).toHaveBeenCalledWith('Certeza?');
    });
});

describe('confirmarAcao', () => {
    it.each([
        ['info', 'modal-header-icon-info', 'btn-primary', 'modal-callout-info'],
        ['warning', 'modal-header-icon-warning', 'btn-warning', 'modal-callout-warning'],
        ['error', 'modal-header-icon-error', 'btn-danger', 'modal-callout-error']
    ] as const)('variante %s troca ícone, botão e callout', async (variante, icone, botao, callout) => {
        const promessa = confirmarAcao({ titulo: 'T', mensagem: 'M', rotuloConfirmar: 'agendamento.sim', rotuloCancelar: 'agendamento.nao', variante, icone: 'event', textoAtencao: 'Atenção' });
        expect($('confirmar-exclusao-icone').className).toContain(icone);
        expect($('confirmar-exclusao-icone').className).not.toMatch(variante === 'info' ? /error|warning/ : variante === 'warning' ? /error|info/ : /warning|info/);
        expect($('confirmar-exclusao-btn').classList.contains(botao)).toBe(true);
        expect($('confirmar-exclusao-btn').classList.length).toBe(2);
        expect($('confirmar-exclusao-callout').classList.contains(callout)).toBe(true);
        expect($('confirmar-exclusao-icone').textContent).toBe('event');
        expect($('confirmar-exclusao-btn').textContent).toContain('Sim');
        expect($('confirmar-exclusao-cancelar').textContent).toContain('Não');
        $('confirmar-exclusao-cancelar').click();
        await expect(promessa).resolves.toBe(false);
    });

    it('depois de uma ação com variante, confirmarExclusao volta ao visual de exclusão', async () => {
        const a = confirmarAcao({ titulo: 'T', mensagem: 'M', rotuloConfirmar: 'agendamento.sim', variante: 'info', icone: 'event', conteudo: { html: '<input id="x">' } });
        $('confirmar-exclusao-btn').click();
        await a;
        const e = confirmarExclusao();
        expect($('confirmar-exclusao-btn').classList.contains('btn-danger')).toBe(true);
        expect($('confirmar-exclusao-btn').classList.contains('btn-primary')).toBe(false);
        expect($('confirmar-exclusao-conteudo').innerHTML).toBe('');
        expect($('confirmar-exclusao-cancelar').textContent).toContain('Cancelar');
        $('confirmar-exclusao-cancelar').click();
        await e;
    });

    it('conteudo: valida antes de fechar, devolve os valores coletados e limpa ao fechar', async () => {
        const limpeza = vi.fn();
        const promessa = confirmarAcao({
            titulo: 'T', mensagem: 'M', rotuloConfirmar: 'agendamento.sim', variante: 'warning', icone: 'event_busy',
            conteudo: {
                html: '<input id="campo">',
                aoAbrir: () => limpeza,
                validar: (c) => c.querySelector<HTMLInputElement>('#campo')!.value !== '',
                coletar: (c) => ({ valor: c.querySelector<HTMLInputElement>('#campo')!.value })
            }
        });
        expect($('confirmar-exclusao-conteudo').style.display).toBe('block');

        $('confirmar-exclusao-btn').click(); // inválido: continua aberto
        expect(aberto()).toBe(true);

        $<HTMLInputElement>('campo').value = 'ok';
        $('confirmar-exclusao-btn').click();
        await expect(promessa).resolves.toEqual({ valor: 'ok' });
        expect(aberto()).toBe(false);
        expect(limpeza).toHaveBeenCalledTimes(1);
        expect($('confirmar-exclusao-conteudo').innerHTML).toBe('');
    });

    it('com coletar, cancelar resolve null', async () => {
        const promessa = confirmarAcao({
            titulo: 'T', mensagem: 'M', rotuloConfirmar: 'agendamento.sim', variante: 'info', icone: 'event',
            conteudo: { html: '', coletar: () => 1 }
        });
        $('confirmar-exclusao-cancelar').click();
        await expect(promessa).resolves.toBeNull();
    });

    it('uma nova confirmação cancela a pendente', async () => {
        const primeira = confirmarAcao({ titulo: 'A', mensagem: 'a', rotuloConfirmar: 'agendamento.sim', variante: 'info', icone: 'event' });
        const segunda = confirmarAcao({ titulo: 'B', mensagem: 'b', rotuloConfirmar: 'agendamento.sim', variante: 'info', icone: 'event' });
        await expect(primeira).resolves.toBe(false);
        expect(aberto()).toBe(true);
        $('confirmar-exclusao-btn').click();
        await expect(segunda).resolves.toBe(true);
    });
});
