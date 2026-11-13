import { t } from '../../core/state/i18nStore.js';

/** Backend `senhaForte` policy: single source of truth for every password UI. */
export const SENHA_MIN_CARACTERES = 12;
export const SENHA_MAX_BYTES = 72;

export interface AvaliacaoSenha {
    tamanho: boolean;
    bytes: boolean;
    minuscula: boolean;
    maiuscula: boolean;
    numero: boolean;
    especial: boolean;
}

export type RegraSenha = keyof AvaliacaoSenha;

export const REGRAS_SENHA: ReadonlyArray<{ regra: RegraSenha; chave: string }> = [
    { regra: 'tamanho', chave: 'password.regra_tamanho' },
    { regra: 'minuscula', chave: 'password.regra_minuscula' },
    { regra: 'maiuscula', chave: 'password.regra_maiuscula' },
    { regra: 'numero', chave: 'password.regra_numero' },
    { regra: 'especial', chave: 'password.regra_especial' },
    { regra: 'bytes', chave: 'password.regra_bytes' }
];

export function avaliarSenha(senha: string): AvaliacaoSenha {
    return {
        tamanho: senha.length >= SENHA_MIN_CARACTERES,
        bytes: new TextEncoder().encode(senha).length <= SENHA_MAX_BYTES,
        minuscula: /[a-z]/.test(senha),
        maiuscula: /[A-Z]/.test(senha),
        numero: /\d/.test(senha),
        especial: /[^A-Za-z0-9]/.test(senha)
    };
}

export function senhaAtendeRegras(senha: string): boolean {
    return Object.values(avaliarSenha(senha)).every(Boolean);
}

export interface PasswordFieldOptions {
    /** Shows the live rules checklist below the field (only for new-password inputs). */
    checklist?: boolean;
}

export interface PasswordFieldControl {
    atualizar(): void;
}

const SVG_OLHO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="password-field__eye"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const SVG_OLHO_CORTADO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="password-field__eye"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.1 9.1 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

let contador = 0;

/** Evento que volta o campo a oculto (type=password) e atualiza o botão; disparado ao fechar modais e ao enviar/resetar o form. */
export const EVENTO_REDEFINIR_SENHA = 'passwordfield:reset';

/** Oculta a senha de todos os campos aprimorados dentro de `raiz` (ex.: ao fechar um modal). */
export function ocultarCamposSenha(raiz: ParentNode): void {
    raiz.querySelectorAll<HTMLInputElement>('input[data-password-field="true"]').forEach((campo) => {
        campo.dispatchEvent(new CustomEvent(EVENTO_REDEFINIR_SENHA));
    });
}

/**
 * Wraps a password input with a show/hide toggle and (optionally) a live rules checklist.
 * Idempotent: calling it again on the same input returns a fresh `atualizar` and adds nothing.
 */
export function aprimorarCampoSenha(input: HTMLInputElement, opcoes: PasswordFieldOptions = {}): PasswordFieldControl {
    if (input.dataset.passwordField === 'true') return { atualizar: () => undefined };
    input.dataset.passwordField = 'true';
    const uid = `pf${++contador}`;

    const wrap = document.createElement('div');
    wrap.className = 'password-field';
    input.parentNode?.insertBefore(wrap, input);
    wrap.appendChild(input);

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'password-field__toggle';
    wrap.appendChild(botao);

    const aplicarToggle = (): void => {
        const visivel = input.type === 'text';
        botao.setAttribute('aria-pressed', String(visivel));
        botao.setAttribute('aria-label', t(visivel ? 'password.ocultar' : 'password.mostrar'));
        botao.innerHTML = visivel ? SVG_OLHO_CORTADO : SVG_OLHO;
    };
    botao.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';
        aplicarToggle();
    });
    aplicarToggle();

    const ocultar = (): void => {
        input.type = 'password';
        aplicarToggle();
    };
    input.addEventListener(EVENTO_REDEFINIR_SENHA, ocultar);
    input.addEventListener('input', aplicarToggle);
    const form = input.form;
    if (form) {
        form.addEventListener('submit', ocultar);
        // `reset` limpa o valor depois do evento: adia para refletir o estado final.
        form.addEventListener('reset', () => setTimeout(ocultar, 0));
    }

    if (!opcoes.checklist) return { atualizar: aplicarToggle };

    const lista = document.createElement('ul');
    lista.className = 'password-rules';
    lista.id = `${uid}-regras`;
    const resumo = document.createElement('p');
    resumo.className = 'password-rules__summary visually-hidden';
    resumo.id = `${uid}-resumo`;
    resumo.setAttribute('aria-live', 'polite');
    wrap.after(lista, resumo);
    const descricao = input.getAttribute('aria-describedby');
    input.setAttribute('aria-describedby', [descricao, lista.id].filter(Boolean).join(' '));

    const itens = REGRAS_SENHA.map(({ regra }) => {
        const li = document.createElement('li');
        li.dataset.regra = regra;
        lista.appendChild(li);
        return li;
    });

    const atualizar = (): void => {
        aplicarToggle();
        const av = avaliarSenha(input.value);
        let atendidas = 0;
        REGRAS_SENHA.forEach(({ regra, chave }, i) => {
            const ok = av[regra];
            if (ok) atendidas++;
            itens[i].dataset.state = ok ? 'met' : 'unmet';
            itens[i].innerHTML = '';
            const icone = document.createElement('span');
            icone.className = 'password-rules__icon';
            icone.setAttribute('aria-hidden', 'true');
            icone.textContent = ok ? '✓' : '○';
            const estado = document.createElement('span');
            estado.className = 'visually-hidden';
            estado.textContent = `${t(ok ? 'password.atendida' : 'password.pendente')}: `;
            const texto = document.createElement('span');
            texto.textContent = t(chave);
            itens[i].append(icone, estado, texto);
        });
        resumo.textContent = t('password.resumo')
            .replace('{n}', String(atendidas))
            .replace('{total}', String(REGRAS_SENHA.length));
    };
    input.addEventListener('input', atualizar);
    atualizar();
    return { atualizar };
}
