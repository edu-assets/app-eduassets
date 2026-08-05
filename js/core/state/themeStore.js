const STORAGE_KEY = 'eduassets_theme';
const TEMAS_VALIDOS = ['light', 'dark', 'system'];

const mediaEscuro = window.matchMedia('(prefers-color-scheme: dark)');

let preferencia = localStorage.getItem(STORAGE_KEY);
if (!TEMAS_VALIDOS.includes(preferencia)) preferencia = 'system';

let listeners = [];

export function getPreferenciaTema() {
    return preferencia;
}

export function getTemaResolvido() {
    return preferencia === 'system' ? (mediaEscuro.matches ? 'dark' : 'light') : preferencia;
}

export function definirTema(tema) {
    if (!TEMAS_VALIDOS.includes(tema) || tema === preferencia) return;
    preferencia = tema;
    localStorage.setItem(STORAGE_KEY, tema);
    aplicarTema();
}

export function initTheme() {
    aplicarTema();
    mediaEscuro.addEventListener('change', () => {
        if (preferencia === 'system') aplicarTema();
    });
}

export function subscribe(callback) {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((listener) => listener !== callback);
    };
}

function aplicarTema() {
    document.documentElement.setAttribute('data-theme', getTemaResolvido());
    notify();
}

function notify() {
    const resolvido = getTemaResolvido();
    listeners.forEach((callback) => callback(resolvido, preferencia));
}