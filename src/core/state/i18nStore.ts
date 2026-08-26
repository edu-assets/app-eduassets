import pt from '../i18n/pt.json';
import en from '../i18n/en.json';

type Idioma = 'pt' | 'en';
type I18nListener = (idioma: Idioma) => void;

const STORAGE_KEY = 'eduassets_lang';
const IDIOMAS_VALIDOS: Idioma[] = ['pt', 'en'];

const DICIONARIOS: Record<Idioma, Record<string, string>> = { pt, en };
const ATRIBUTOS_TRADUZIVEIS = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const CHAVE_POR_TEXTO_PT = new Map(Object.entries(pt).map(([chave, texto]) => [texto, chave]));
const CHAVES_DE_BOTOES: Record<string, string> = {
    '#modal-categoria-fechar': 'dashboard.fechar',
    '#btn-dashboard-exportar': 'shell.exportar',
    '#controle-modal-cancelar': 'shell.cancelar',
    '#controle-modal-salvar': 'shell.salvar',
    '#controle-resolver-cancelar': 'shell.cancelar',
    '#controle-resolver-confirmar': 'shell.confirmar_resolucao',
    '#btn-novo-registro': 'shell.novo',
    '#btn-resolver-registro': 'controle.resolver',
    '#btn-editar-registro': 'controle.editar',
    '#btn-deletar-registro': 'shell.deletar',
    '#cadastro-modal-cancelar': 'shell.cancelar',
    '#cadastro-modal-salvar': 'shell.salvar',
    '#btn-rfid-revogar': 'shell.revogar_cartao',
    '#rfid-modal-fechar': 'dashboard.fechar',
    '#config-salvar': 'shell.salvar_configuracoes',
    '#seguranca-senha-cancelar': 'shell.cancelar',
    '#seguranca-senha-salvar': 'shell.atualizar_senha',
    '#login-btn-entrar': 'shell.entrar',
    '#confirmar-exclusao-cancelar': 'shell.cancelar',
    '#confirmar-exclusao-btn': 'shell.excluir_registro'
};
let observador: MutationObserver | null = null;

function ehIdiomaValido(valor: string | null): valor is Idioma {
    return IDIOMAS_VALIDOS.includes(valor as Idioma);
}

function idiomaPadrao(): Idioma {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (ehIdiomaValido(salvo)) return salvo;

    // Sem preferência salva: detecta o idioma do navegador, mas o projeto
    // nasceu em pt-BR, então qualquer coisa que não seja explicitamente
    // inglês cai em português por padrão.
    const idiomaNavegador = navigator.language?.toLowerCase() ?? '';
    return idiomaNavegador.startsWith('en') ? 'en' : 'pt';
}

let idioma: Idioma = idiomaPadrao();
let listeners: I18nListener[] = [];

export function getIdioma(): Idioma {
    return idioma;
}

export function definirIdioma(novoIdioma: Idioma): void {
    if (!ehIdiomaValido(novoIdioma) || novoIdioma === idioma) return;
    idioma = novoIdioma;
    localStorage.setItem(STORAGE_KEY, novoIdioma);
    aplicarIdioma();
}

export function initI18n(): void {
    aplicarIdioma();
    observarConteudoNovo();
}

export function subscribe(callback: I18nListener): () => void {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

/**
 * Traduz uma chave para o idioma ativo. Se a chave não existir no
 * dicionário do idioma atual, cai para o dicionário em português; se
 * também não existir lá, retorna a própria chave (nunca quebra a UI).
 */
export function t(chave: string): string {
    return DICIONARIOS[idioma][chave] ?? DICIONARIOS.pt[chave] ?? chave;
}

/** Traduz uma mensagem legada em português quando ela existe no dicionário. */
export function traduzirTexto(texto: string): string {
    return t(CHAVE_POR_TEXTO_PT.get(texto) ?? texto);
}

function aplicarIdioma(): void {
    document.documentElement.setAttribute('lang', idioma === 'en' ? 'en' : 'pt-BR');
    traduzirDocumento();
    notify();
}

function notify(): void {
    listeners.forEach((callback) => callback(idioma));
}

/**
 * Traduz o markup estático do index.html e qualquer conteúdo inserido por
 * componentes legados. Ao encontrar texto em português conhecido, guardamos a
 * chave no próprio nó/atributo; assim as próximas trocas de idioma não
 * dependem do texto que estiver atualmente exibido.
 */
function traduzirDocumento(): void {
    Object.entries(CHAVES_DE_BOTOES).forEach(([seletor, chave]) => {
        document.querySelectorAll<HTMLElement>(seletor).forEach((elemento) => {
            elemento.dataset.i18nKey = chave;
        });
    });
    traduzirElemento(document.body);
}

function traduzirElemento(raiz: Node | null): void {
    if (!raiz) return;

    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
        acceptNode(no) {
            const pai = no.parentElement;
            if (!pai || ['SCRIPT', 'STYLE'].includes(pai.tagName)) return NodeFilter.FILTER_REJECT;
            return no.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    });

    const textos: Text[] = raiz.nodeType === Node.TEXT_NODE ? [raiz as Text] : [];
    while (walker.nextNode()) textos.push(walker.currentNode as Text);

    textos.forEach((no) => {
        const chave = no.parentElement?.dataset.i18nKey ?? CHAVE_POR_TEXTO_PT.get(no.textContent?.trim() ?? '');
        if (!chave || !no.parentElement) return;
        no.parentElement.dataset.i18nKey = chave;
        no.textContent = preservarEspacos(no.textContent ?? '', t(chave));
    });

    const elementos: HTMLElement[] = raiz instanceof HTMLElement
        ? [raiz, ...raiz.querySelectorAll<HTMLElement>('*')]
        : raiz instanceof Element
            ? Array.from(raiz.querySelectorAll<HTMLElement>('*'))
            : [];
    elementos.forEach((elemento) => {
        ATRIBUTOS_TRADUZIVEIS.forEach((atributo) => {
            const dataKey = `i18n${atributo.replace(/-([a-z])/g, (_, letra: string) => letra.toUpperCase())}` as keyof DOMStringMap;
            const valor = elemento.getAttribute(atributo);
            const chave = elemento.dataset[dataKey] ?? (valor ? CHAVE_POR_TEXTO_PT.get(valor) : undefined);
            if (!chave) return;
            elemento.dataset[dataKey] = chave;
            elemento.setAttribute(atributo, t(chave));
        });
    });
}

function preservarEspacos(original: string, traducao: string): string {
    const inicio = original.match(/^\s*/)?.[0] ?? '';
    const fim = original.match(/\s*$/)?.[0] ?? '';
    return `${inicio}${traducao}${fim}`;
}

function observarConteudoNovo(): void {
    if (observador || !document.body) return;
    observador = new MutationObserver((mutacoes) => {
        mutacoes.forEach((mutacao) => {
            mutacao.addedNodes.forEach((no) => traduzirElemento(no));
        });
    });
    observador.observe(document.body, { childList: true, subtree: true });
}
