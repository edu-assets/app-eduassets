type Tema = 'light' | 'dark' | 'system';
type TemaResolvido = 'light' | 'dark';
type ThemeListener = (resolvido: TemaResolvido, preferencia: Tema) => void;

const STORAGE_KEY = 'eduassets_theme';
const TEMAS_VALIDOS: Tema[] = ['light', 'dark', 'system'];

const mediaEscuro = window.matchMedia('(prefers-color-scheme: dark)');

function ehTemaValido(valor: string | null): valor is Tema {
    return TEMAS_VALIDOS.includes(valor as Tema);
}

const preferenciaSalva = localStorage.getItem(STORAGE_KEY);
let preferencia: Tema = ehTemaValido(preferenciaSalva) ? preferenciaSalva : 'system';

let listeners: ThemeListener[] = [];

export function getPreferenciaTema(): Tema {
    return preferencia;
}

export function getTemaResolvido(): TemaResolvido {
    return preferencia === 'system' ? (mediaEscuro.matches ? 'dark' : 'light') : preferencia;
}

export function definirTema(tema: Tema): void {
    if (!ehTemaValido(tema) || tema === preferencia) return;
    preferencia = tema;
    localStorage.setItem(STORAGE_KEY, tema);
    aplicarTema();
}

export function initTheme(): void {
    aplicarTema();
    mediaEscuro.addEventListener('change', () => {
        if (preferencia === 'system') aplicarTema();
    });
}

export function subscribe(callback: ThemeListener): () => void {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function aplicarTema(): void {
    document.documentElement.setAttribute('data-theme', getTemaResolvido());
    notify();
}

function notify(): void {
    const resolvido = getTemaResolvido();
    listeners.forEach((callback) => callback(resolvido, preferencia));
}