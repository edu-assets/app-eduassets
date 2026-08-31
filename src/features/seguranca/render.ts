import type { AuthUser } from '../../types/index.js';

export interface SegurancaEls {
    email: HTMLElement | null;
    btnToggleSenha: HTMLElement;
    formSenha: HTMLElement;
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
}

function liberarReadonlyNoFoco(input: HTMLInputElement): void {
    const remover = () => {
        input.removeAttribute('readonly');
        input.removeEventListener('focus', remover);
    };
    input.addEventListener('focus', remover);
}

export function habilitarProtecaoAutofill(els: SegurancaEls): void {
    [els.inputAtual, els.inputNova, els.inputConfirmar].forEach((input) => {
        input.setAttribute('readonly', 'true');
        liberarReadonlyNoFoco(input);
    });
}

export function alternarFormSenha(els: SegurancaEls, estado: SegurancaEstado, abrir: boolean): void {
    estado.formAberto = abrir;
    els.formSenha.style.display = abrir ? 'flex' : 'none';
    els.btnToggleSenha.setAttribute('aria-expanded', String(abrir));

    els.inputAtual.value = '';
    els.inputNova.value = '';
    els.inputConfirmar.value = '';
    mostrarErro(els, '');

    if (abrir) habilitarProtecaoAutofill(els);
}

export function mostrarErro(els: SegurancaEls, mensagem: string): void {
    if (!els.erro) return;
    els.erro.textContent = mensagem;
    els.erro.style.display = mensagem ? 'block' : 'none';
}