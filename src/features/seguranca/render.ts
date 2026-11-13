import type { AuthUser } from '../../types/index.js';
import { getIdioma, t } from '../../core/state/i18nStore.js';

export interface SegurancaEls {
    email: HTMLElement | null;
    senhaAlteradaEm: HTMLElement | null;
    btnToggleSenha: HTMLElement;
    formSenha: HTMLElement;
    usernameOculto?: HTMLInputElement | null;
    inputAtual: HTMLInputElement;
    inputNova: HTMLInputElement;
    inputConfirmar: HTMLInputElement;
    erro: HTMLElement | null;
    btnSalvar: HTMLButtonElement;
    btnCancelar: HTMLElement;
}

export interface SegurancaEstado {
    formAberto: boolean;
}

export function renderInfoConta(els: SegurancaEls, usuario: AuthUser | null): void {
    if (els.email) els.email.textContent = usuario?.login ?? '—';
    // Campo oculto só para gerenciadores de senha atualizarem a conta certa.
    if (els.usernameOculto) els.usernameOculto.value = usuario?.login ?? '';
    if (els.senhaAlteradaEm) {
        const valor = usuario?.senhaAlteradaEm;
        els.senhaAlteradaEm.textContent = valor
            ? formatarDataHora(valor)
            : t('shell.sem_registro');
    }
}

function formatarDataHora(iso: string): string {
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) return t('shell.sem_registro');
    const locale = getIdioma() === 'en' ? 'en-US' : 'pt-BR';
    return data.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
}

export function alternarFormSenha(els: SegurancaEls, estado: SegurancaEstado, abrir: boolean): void {
    estado.formAberto = abrir;
    els.formSenha.style.display = abrir ? 'flex' : 'none';
    els.btnToggleSenha.setAttribute('aria-expanded', String(abrir));

    els.inputAtual.value = '';
    els.inputNova.value = '';
    els.inputConfirmar.value = '';
    [els.inputAtual, els.inputNova, els.inputConfirmar].forEach((input) => {
        input.type = 'password';
        input.dispatchEvent(new Event('input'));
    });
    mostrarErro(els, '');

}

export function mostrarErro(els: SegurancaEls, mensagem: string): void {
    if (!els.erro) return;
    els.erro.textContent = mensagem;
    els.erro.style.display = mensagem ? 'block' : 'none';
}