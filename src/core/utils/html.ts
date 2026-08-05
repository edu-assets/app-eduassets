import { escapeHtml } from './sanitize.js';

export interface RawHtml {
    __raw: string;
}

export function raw(str: unknown): RawHtml {
    return { __raw: String(str ?? '') };
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
    let out = strings[0];

    values.forEach((valor, i) => {
        if (Array.isArray(valor)) {
            out += valor.map((item) => formatar(item)).join('');
        } else {
            out += formatar(valor);
        }
        out += strings[i + 1];
    });

    return out;
}

function formatar(valor: unknown): string {
    if (valor && typeof valor === 'object' && '__raw' in valor) {
        return (valor as RawHtml).__raw;
    }
    return escapeHtml(valor);
}