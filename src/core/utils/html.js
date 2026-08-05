import { escapeHtml } from './sanitize.js';

export function raw(str) {
    return { __raw: String(str ?? '') };
}

export function html(strings, ...values) {
    let out = strings[0];

    values.forEach((valor, i) => {
        if (Array.isArray(valor)) {
            out += valor.map(item => formatar(item)).join('');
        } else {
            out += formatar(valor);
        }
        out += strings[i + 1];
    });

    return out;
}

function formatar(valor) {
    if (valor && typeof valor === 'object' && '__raw' in valor) {
        return valor.__raw;
    }
    return escapeHtml(valor);
}