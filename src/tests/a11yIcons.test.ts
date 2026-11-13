// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';
import { ocultarIconesDecorativos, initIconesDecorativos } from '../shared/dom/a11yIcons.js';

describe('ocultarIconesDecorativos', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('marca como aria-hidden icones sem nome acessivel', () => {
        document.body.innerHTML = '<button><span class="material-symbols-outlined">check</span> Registrar</button>';
        ocultarIconesDecorativos(document.body);
        expect(document.querySelector('.material-symbols-outlined')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('respeita aria-label, aria-labelledby, aria-hidden existente e role="img"', () => {
        document.body.innerHTML = `
            <span class="material-symbols-outlined" aria-label="Sair" id="a"></span>
            <span class="material-symbols-outlined" aria-labelledby="x" id="b"></span>
            <span class="material-symbols-outlined" aria-hidden="false" id="c"></span>
            <span class="material-symbols-outlined" role="img" id="d"></span>`;
        ocultarIconesDecorativos(document.body);
        expect(document.getElementById('a')?.hasAttribute('aria-hidden')).toBe(false);
        expect(document.getElementById('b')?.hasAttribute('aria-hidden')).toBe(false);
        expect(document.getElementById('c')?.getAttribute('aria-hidden')).toBe('false');
        expect(document.getElementById('d')?.hasAttribute('aria-hidden')).toBe(false);
    });

    it('aplica a conteudo adicionado dinamicamente via initIconesDecorativos', async () => {
        document.body.innerHTML = '';
        initIconesDecorativos();
        const novo = document.createElement('div');
        novo.innerHTML = '<span class="material-symbols-outlined" id="dyn">add</span>';
        document.body.appendChild(novo);
        await new Promise((r) => setTimeout(r, 0));
        expect(document.getElementById('dyn')?.getAttribute('aria-hidden')).toBe('true');
    });
});

describe('index.html icon-only controls', () => {
    it('todo botao/link cujo unico conteudo e icone tem nome acessivel', () => {
        const doc = new DOMParser().parseFromString(indexHtml, 'text/html');
        const semNome: string[] = [];
        doc.querySelectorAll<HTMLElement>('button, a').forEach((el) => {
            if (!el.querySelector('.material-symbols-outlined')) return;
            const icones = Array.from(el.querySelectorAll<HTMLElement>('.material-symbols-outlined'))
                .map((icone) => icone.textContent ?? '').join('');
            const textoVisivel = (el.textContent ?? '').replace(icones, '').replace(/\s+/g, '');
            if (textoVisivel) return;
            const nomeado = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || el.hasAttribute('title');
            if (!nomeado) semNome.push(el.outerHTML.slice(0, 120));
        });
        expect(semNome).toEqual([]);
    });
});
