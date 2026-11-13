/**
 * Cadastros "sheet": the Cadastros modal has exactly ONE scroll container (the `.modal-box`)
 * and two views that replace each other inside it:
 *
 *  - list view   → the existing header / body (create fields + search + list) / footer;
 *  - detail view → a dedicated screen for editing one record (Editar usuário, Ajustar total,
 *                  Renomear categoria, Editar responsável) or for the per-user tools that used to
 *                  open a second modal on top (Redefinir senha, Cartão RFID).
 *
 * Opening a detail view hides the list parts, scrolls the sheet to the top and moves focus into
 * the form; "Voltar"/Cancelar/Escape/successful save return to the list, restoring the scroll
 * position, the search term (the input is never touched) and the focus on the row action.
 * There is never a modal inside a modal nor a nested scroll area.
 *
 * Same pattern on desktop (centered dialog) and mobile (full-screen sheet sized to the
 * visualViewport so the sticky footer stays above the on-screen keyboard; see cadastros.css).
 */
import { html } from '../../core/utils/html.js';
import { t } from '../../core/state/i18nStore.js';

export interface OpcoesDetalhe {
    titulo: string;
    subtitulo?: string;
    /** Material symbol shown next to the title. */
    icone?: string;
    /** HTML rendered in the detail body (escaped by the caller's templates). */
    corpoHtml?: string;
    /** HTML rendered in the pinned footer. */
    rodapeHtml?: string;
    /** Existing DOM nodes moved into the body/footer while the view is open, then put back. */
    hospedarCorpo?: HTMLElement[];
    hospedarRodape?: HTMLElement[];
    /** Selector (inside the list) of the control that opened the view; refocused on return. */
    gatilho?: string | null;
    /** Selector (inside the detail view) of the element to focus when it opens. */
    focar?: string | null;
    /** Called when leaving the view (any route: Voltar, Escape, closing the modal, save). */
    aoSair?: () => void;
}

interface NoHospedado {
    no: HTMLElement;
    pai: Node;
    proximo: Node | null;
}

export interface SheetCadastro {
    readonly box: HTMLElement;
    readonly detalhe: HTMLElement;
    readonly corpo: HTMLElement;
    readonly rodape: HTMLElement;
    abrirDetalhe(opcoes: OpcoesDetalhe): void;
    voltarParaLista(opcoes?: { restaurarFoco?: boolean }): void;
    emDetalhe(): boolean;
}

const MQ_MOBILE = '(max-width: 640px)';

function ehMobile(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia(MQ_MOBILE).matches;
}

function renderEstruturaDetalhe(): string {
    return html`
        <div class="cadastro-detalhe-header" data-i18n-exclude>
            <button type="button" class="cadastro-detalhe-voltar" data-edicao-voltar>
                <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                <span class="cadastro-detalhe-voltar-texto"></span>
            </button>
            <div class="cadastro-detalhe-titulos">
                <h3 class="cadastro-detalhe-titulo" id="cadastro-detalhe-titulo" tabindex="-1"></h3>
                <p class="modal-subtitle cadastro-detalhe-subtitulo" id="cadastro-detalhe-subtitulo"></p>
            </div>
        </div>
        <div class="cadastro-detalhe-body" id="cadastro-detalhe-body"></div>
        <div class="cadastro-detalhe-footer" id="cadastro-detalhe-footer"></div>
    `;
}

export function criarSheetCadastro(overlay: HTMLElement): SheetCadastro | null {
    const boxEncontrado = overlay.querySelector<HTMLElement>('.modal-box');
    if (!boxEncontrado) return null;
    const box: HTMLElement = boxEncontrado;
    box.classList.add('cadastro-sheet');

    let detalhe = box.querySelector<HTMLElement>('.cadastro-detalhe');
    if (!detalhe) {
        detalhe = document.createElement('section');
        detalhe.className = 'cadastro-detalhe';
        detalhe.id = 'cadastro-modal-detalhe';
        detalhe.hidden = true;
        detalhe.setAttribute('aria-labelledby', 'cadastro-detalhe-titulo');
        detalhe.innerHTML = renderEstruturaDetalhe();
        box.appendChild(detalhe);
    }
    const secao = detalhe;
    const titulo = secao.querySelector<HTMLElement>('.cadastro-detalhe-titulo') as HTMLElement;
    const subtitulo = secao.querySelector<HTMLElement>('.cadastro-detalhe-subtitulo') as HTMLElement;
    const voltarTexto = secao.querySelector<HTMLElement>('.cadastro-detalhe-voltar-texto') as HTMLElement;
    const btnVoltar = secao.querySelector<HTMLButtonElement>('.cadastro-detalhe-voltar') as HTMLButtonElement;
    const corpo = secao.querySelector<HTMLElement>('.cadastro-detalhe-body') as HTMLElement;
    const rodape = secao.querySelector<HTMLElement>('.cadastro-detalhe-footer') as HTMLElement;

    const partesLista = (): HTMLElement[] => Array.from(box.children)
        .filter((el): el is HTMLElement => el instanceof HTMLElement && el !== secao);

    let aberto = false;
    let scrollLista = 0;
    let gatilho: string | null = null;
    let aoSair: (() => void) | undefined;
    let hospedados: NoHospedado[] = [];
    let labelledbyLista: string | null = null;
    /** List parts hidden by the detail view (parts that were already hidden stay hidden on return). */
    let ocultadas: HTMLElement[] = [];

    function hospedar(nos: HTMLElement[] | undefined, destino: HTMLElement): void {
        nos?.forEach((no) => {
            if (!no.parentNode) return;
            hospedados.push({ no, pai: no.parentNode, proximo: no.nextSibling });
            destino.appendChild(no);
        });
    }

    function devolverHospedados(): void {
        // Reverse order so each `proximo` reference is back in place before it is used.
        for (const { no, pai, proximo } of hospedados.reverse()) {
            pai.insertBefore(no, proximo && proximo.parentNode === pai ? proximo : null);
        }
        hospedados = [];
    }

    function sair(): void {
        const callback = aoSair;
        aoSair = undefined;
        devolverHospedados();
        corpo.innerHTML = '';
        rodape.innerHTML = '';
        callback?.();
    }

    function abrirDetalhe(opcoes: OpcoesDetalhe): void {
        if (aberto) {
            // Switching detail → detail keeps the list's scroll position and original trigger.
            sair();
        } else {
            scrollLista = box.scrollTop;
            gatilho = opcoes.gatilho ?? null;
            labelledbyLista = box.getAttribute('aria-labelledby');
        }

        voltarTexto.textContent = t('cadastros.voltar');
        btnVoltar.setAttribute('aria-label', t('cadastros.voltar_lista'));
        titulo.textContent = opcoes.titulo;
        subtitulo.textContent = opcoes.subtitulo ?? '';
        subtitulo.hidden = !opcoes.subtitulo;
        corpo.innerHTML = opcoes.corpoHtml ?? '';
        rodape.innerHTML = opcoes.rodapeHtml ?? '';
        hospedar(opcoes.hospedarCorpo, corpo);
        hospedar(opcoes.hospedarRodape, rodape);
        rodape.hidden = !rodape.children.length;
        aoSair = opcoes.aoSair;

        if (!ocultadas.length) {
            ocultadas = partesLista().filter((parte) => !parte.hidden);
            ocultadas.forEach((parte) => { parte.hidden = true; });
        }
        secao.hidden = false;
        box.classList.add('cadastro-sheet--detalhe');
        box.setAttribute('aria-labelledby', 'cadastro-detalhe-titulo');
        box.scrollTop = 0;
        aberto = true;

        const alvo = opcoes.focar ? secao.querySelector<HTMLElement>(opcoes.focar) : null;
        (alvo ?? titulo).focus({ preventScroll: true });
    }

    function voltarParaLista({ restaurarFoco = true } = {}): void {
        if (!aberto) return;
        aberto = false;
        sair();

        secao.hidden = true;
        ocultadas.forEach((parte) => { parte.hidden = false; });
        ocultadas = [];
        box.classList.remove('cadastro-sheet--detalhe');
        if (labelledbyLista) box.setAttribute('aria-labelledby', labelledbyLista);
        box.scrollTop = scrollLista;

        if (restaurarFoco) {
            const alvo = gatilho ? box.querySelector<HTMLElement>(gatilho) : null;
            (alvo ?? box.querySelector<HTMLElement>('#cadastro-modal-busca') ?? box).focus({ preventScroll: true });
        }
        gatilho = null;
    }

    secao.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('[data-edicao-voltar]')) voltarParaLista();
    });

    // Escape steps back to the list instead of closing the whole Cadastros modal.
    overlay.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !aberto) return;
        e.stopPropagation();
        voltarParaLista();
    });

    // Closing the modal (X, overlay click, Escape on the list) always resets to the list view.
    new MutationObserver(() => {
        if (!overlay.classList.contains('active') && aberto) voltarParaLista({ restaurarFoco: false });
        if (overlay.classList.contains('active')) sincronizarViewport(overlay);
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });

    acompanharTeclado(overlay, box);

    return {
        box,
        detalhe: secao,
        corpo,
        rodape,
        abrirDetalhe,
        voltarParaLista,
        emDetalhe: () => aberto
    };
}

/* ===== On-screen keyboard (mobile) ===== */

/**
 * Exposes the visual viewport to CSS (`--cadastro-vv-h` / `--cadastro-vv-top`). On mobile the
 * sheet is sized to it, so when the keyboard opens the sheet shrinks and its sticky footer
 * (primary action) sits right above the keyboard instead of behind it (avoids the 100vh trap).
 */
export function sincronizarViewport(overlay: HTMLElement): void {
    const vv = window.visualViewport;
    if (!vv) return;
    overlay.style.setProperty('--cadastro-vv-h', `${Math.round(vv.height)}px`);
    overlay.style.setProperty('--cadastro-vv-top', `${Math.round(vv.offsetTop)}px`);
}

function tecladoProvavelmenteAberto(): boolean {
    const vv = window.visualViewport;
    return !!vv && vv.height < window.innerHeight * 0.8;
}

/** After the keyboard opens (visualViewport resize), keeps the focused field centered in the sheet. */
export function manterCampoVisivel(campo: HTMLElement, atrasoMs = 450): void {
    const vv = window.visualViewport;
    let feito = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const rolar = (): void => {
        if (feito) return;
        feito = true;
        vv?.removeEventListener('resize', rolar);
        if (timer) clearTimeout(timer);
        if (document.activeElement === campo) campo.scrollIntoView({ block: 'center', inline: 'nearest' });
    };
    if (tecladoProvavelmenteAberto()) {
        // Keyboard already up (moving between fields): no resize will come.
        rolar();
        return;
    }
    vv?.addEventListener('resize', rolar);
    timer = setTimeout(rolar, atrasoMs);
}

function acompanharTeclado(overlay: HTMLElement, box: HTMLElement): void {
    const vv = window.visualViewport;
    const sync = (): void => {
        if (overlay.classList.contains('active')) sincronizarViewport(overlay);
    };
    // Registered before any `manterCampoVisivel` listener, so CSS sizes are updated first.
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);

    box.addEventListener('focusin', (e) => {
        const alvo = e.target;
        if (!(alvo instanceof HTMLElement) || !alvo.matches('input, select, textarea') || !ehMobile()) return;
        manterCampoVisivel(alvo);
    });
}
