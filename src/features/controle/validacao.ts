import { t } from '../../core/state/i18nStore.js';
import type { ControleEls } from './render.js';

type CampoModal = HTMLSelectElement | HTMLInputElement;

// Obrigatórios conforme o schema da API (ocorrenciaCreateSchema): equipamento
// (categoria + modelo), problema e ao menos um número de identificação.
function camposObrigatorios(els: ControleEls): Array<[CampoModal, string]> {
    return [
        [els.campoCategoria, 'controle.erro_categoria_obrigatoria'],
        [els.campoModelo, 'controle.erro_modelo_obrigatorio'],
        [els.campoNumero, 'controle.erro_numero_obrigatorio'],
        [els.campoProblema, 'controle.erro_problema_obrigatorio']
    ];
}

function idErro(campo: HTMLElement): string {
    return `${campo.id}-erro`;
}

export function limparErroCampo(campo: HTMLElement): void {
    campo.removeAttribute('aria-invalid');
    campo.removeAttribute('aria-describedby');
    document.getElementById(idErro(campo))?.remove();
}

function mostrarErroCampo(campo: HTMLElement, chave: string): void {
    limparErroCampo(campo);
    const erro = document.createElement('p');
    erro.id = idErro(campo);
    erro.className = 'field-error';
    erro.textContent = t(chave);
    campo.insertAdjacentElement('afterend', erro);
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', erro.id);
}

export function limparErrosModal(els: ControleEls): void {
    camposObrigatorios(els).forEach(([campo]) => limparErroCampo(campo));
}

/** Valida os campos obrigatórios; foca o primeiro inválido e retorna false se houver erro. */
export function validarModal(els: ControleEls): boolean {
    let primeiro: CampoModal | null = null;
    for (const [campo, chave] of camposObrigatorios(els)) {
        if (campo.value.trim()) {
            limparErroCampo(campo);
            continue;
        }
        mostrarErroCampo(campo, chave);
        primeiro ??= campo;
    }
    primeiro?.focus();
    return primeiro === null;
}

export function attachLimpezaErros(els: ControleEls): void {
    camposObrigatorios(els).forEach(([campo]) => {
        const limpar = (): void => limparErroCampo(campo);
        campo.addEventListener('input', limpar);
        campo.addEventListener('change', limpar);
    });
}
