import { t } from '../../core/state/i18nStore.js';

/**
 * Avisos de formulário inline e tematizados (substituem o balão nativo do navegador).
 *
 * - `mostrarErroCampo` / `limparErroCampo`: uso programático (validações que não cabem em atributos HTML).
 * - `instalarValidacaoTematica`: chamado uma vez no boot; intercepta o evento `invalid` de qualquer
 *   formulário (envio nativo, `checkValidity()`, `reportValidity()`), cancela o balão nativo e mostra
 *   o aviso logo abaixo do campo, focando o primeiro inválido.
 */

export type CampoValidavel = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Wrappers que envolvem o campo junto de botões/ícones: o aviso vai depois deles, não dentro. */
const SELETOR_WRAPPER = '[data-field-wrapper], .password-field';

// Sufixo próprio: vários campos já têm um slot estático `#<id>-erro` (ex.: quantidade, Cadastros).
function idErro(campo: HTMLElement): string {
    if (!campo.id) campo.id = `campo-${Math.random().toString(36).slice(2, 10)}`;
    return `${campo.id}-field-error`;
}

/** Slot de erro que a própria tela já reserva para o campo (`#<id>-erro`), quando existe. */
function slotProprio(campo: HTMLElement): HTMLElement | null {
    if (!campo.id) return null;
    const slot = document.getElementById(`${campo.id}-erro`);
    return slot && !slot.classList.contains('field-error') ? slot : null;
}

function ancoraDoAviso(campo: HTMLElement): HTMLElement {
    return campo.closest<HTMLElement>(SELETOR_WRAPPER) ?? campo;
}

/** Remove `id` de uma lista de ids separada por espaço (aria-describedby). */
function semId(lista: string | null, id: string): string {
    return (lista ?? '').split(/\s+/).filter((v) => v && v !== id).join(' ');
}

export function limparErroCampo(campo: HTMLElement): void {
    if (!campo.hasAttribute('aria-invalid') && !campo.id) return;
    // Slot da tela preenchido por este módulo: esvazia; se a tela escreveu nele, é ela quem limpa.
    const slot = slotProprio(campo);
    if (slot?.dataset.preenchidoPelaValidacao !== undefined) {
        delete slot.dataset.preenchidoPelaValidacao;
        slot.textContent = '';
        slot.hidden = true;
    }
    const id = idErro(campo);
    campo.removeAttribute('aria-invalid');
    const descricao = semId(campo.getAttribute('aria-describedby'), id);
    if (descricao) campo.setAttribute('aria-describedby', descricao);
    else campo.removeAttribute('aria-describedby');
    document.getElementById(id)?.remove();
}

export function mostrarErroCampo(campo: HTMLElement, mensagem: string): void {
    const id = idErro(campo);
    let aviso = document.getElementById(id);
    if (!aviso) {
        aviso = document.createElement('p');
        aviso.id = id;
        aviso.className = 'field-error';
        aviso.setAttribute('role', 'alert');
        const icone = document.createElement('span');
        icone.className = 'material-symbols-outlined field-error__icon';
        icone.setAttribute('aria-hidden', 'true');
        icone.textContent = 'error';
        const texto = document.createElement('span');
        texto.className = 'field-error__text';
        aviso.append(icone, texto);
        ancoraDoAviso(campo).insertAdjacentElement('afterend', aviso);
    }
    const texto = aviso.querySelector('.field-error__text');
    if (texto) texto.textContent = mensagem;
    campo.setAttribute('aria-invalid', 'true');
    const descricao = semId(campo.getAttribute('aria-describedby'), id);
    campo.setAttribute('aria-describedby', descricao ? `${descricao} ${id}` : id);
}

/** Mensagem do tema para o estado de validade do campo; `data-msg-obrigatorio`/`data-msg-invalido` sobrescrevem (chaves i18n). */
export function mensagemValidacao(campo: CampoValidavel): string {
    const v = campo.validity;
    const ds = campo.dataset;
    if (v.valueMissing) {
        if (ds.msgObrigatorio) return t(ds.msgObrigatorio);
        return t(campo instanceof HTMLSelectElement ? 'validacao.selecione' : 'validacao.obrigatorio');
    }
    if (ds.msgInvalido) return t(ds.msgInvalido);
    if (v.typeMismatch) return t(campo.type === 'email' ? 'validacao.email' : 'validacao.formato');
    if (v.tooShort) return t('validacao.curto').replace('{min}', String((campo as HTMLInputElement).minLength));
    if (v.tooLong) return t('validacao.longo').replace('{max}', String((campo as HTMLInputElement).maxLength));
    if (v.rangeUnderflow) return t('validacao.minimo').replace('{min}', (campo as HTMLInputElement).min);
    if (v.rangeOverflow) return t('validacao.maximo').replace('{max}', (campo as HTMLInputElement).max);
    if (v.patternMismatch || v.badInput || v.stepMismatch) return t('validacao.formato');
    return campo.validationMessage || t('validacao.formato');
}

function ehCampoValidavel(alvo: EventTarget | null): alvo is CampoValidavel {
    return alvo instanceof HTMLInputElement || alvo instanceof HTMLSelectElement || alvo instanceof HTMLTextAreaElement;
}

let instalado = false;

export function instalarValidacaoTematica(raiz: Document = document): void {
    if (instalado) return;
    instalado = true;

    // Vários `invalid` disparam na mesma rodada (um por campo); só o primeiro recebe foco.
    let focoAgendado = false;

    raiz.addEventListener('invalid', (e) => {
        const campo = e.target;
        if (!ehCampoValidavel(campo)) return;
        e.preventDefault();
        const slot = slotProprio(campo);
        if (slot) {
            // A tela já tem lugar (e talvez mensagem melhor) para o erro deste campo: não duplica.
            if (slot.hidden || !slot.textContent?.trim()) {
                slot.textContent = mensagemValidacao(campo);
                slot.hidden = false;
                slot.dataset.preenchidoPelaValidacao = '';
            }
            campo.setAttribute('aria-invalid', 'true');
        } else {
            mostrarErroCampo(campo, mensagemValidacao(campo));
        }
        if (!focoAgendado) {
            focoAgendado = true;
            queueMicrotask(() => {
                focoAgendado = false;
            });
            campo.focus({ preventScroll: true });
            campo.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        }
    }, true);

    const limparSeValido = (e: Event): void => {
        const campo = e.target;
        if (!ehCampoValidavel(campo) || campo.getAttribute('aria-invalid') !== 'true') return;
        // Erros programáticos somem ao editar; os nativos, só quando o campo fica válido
        // (validity, não checkValidity: este dispararia `invalid` a cada tecla).
        if (campo.dataset.erroManual === undefined && !campo.validity.valid) return;
        delete campo.dataset.erroManual;
        limparErroCampo(campo);
    };
    raiz.addEventListener('input', limparSeValido, true);
    raiz.addEventListener('change', limparSeValido, true);

    // `form.reset()` limpa os valores: os avisos também.
    raiz.addEventListener('reset', (e) => {
        const form = e.target;
        if (!(form instanceof HTMLFormElement)) return;
        form.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach(limparErroCampo);
    }, true);
}

/**
 * Erro de regra de negócio num campo (ex.: "adicione ao menos um equipamento").
 * Some assim que o usuário edita o campo; foca o campo.
 */
export function sinalizarErroCampo(campo: HTMLElement, mensagem: string, focar = true): void {
    campo.dataset.erroManual = '';
    mostrarErroCampo(campo, mensagem);
    if (focar) campo.focus();
}
