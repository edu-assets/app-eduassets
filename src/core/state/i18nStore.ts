import pt from '../i18n/pt.json';
import en from '../i18n/en.json';

type Idioma = 'pt' | 'en';
type I18nListener = (idioma: Idioma) => void;

const STORAGE_KEY = 'eduassets_lang';
const IDIOMAS_VALIDOS: Idioma[] = ['pt', 'en'];

const DICIONARIOS: Record<Idioma, Record<string, string>> = { pt, en };

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

function aplicarIdioma(): void {
    document.documentElement.setAttribute('lang', idioma === 'en' ? 'en' : 'pt-BR');
    notify();
}

function notify(): void {
    listeners.forEach((callback) => callback(idioma));
}
