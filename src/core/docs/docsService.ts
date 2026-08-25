import { DOCS_REGISTRY, getDocMeta } from './registry.js';
import type { DocRegistryItem } from './registry.js';
import { renderizarMarkdown } from './markdownRenderer.js';
import type { HeadingItem } from './markdownRenderer.js';

export interface LoadedDocument {
    meta: DocRegistryItem;
    markdown: string;
    html: string;
    headings: HeadingItem[];
}

export interface SearchResultado {
    doc: DocRegistryItem;
    trecho: string;
}

const cache = new Map<string, LoadedDocument>();
const inflight = new Map<string, Promise<LoadedDocument>>();

async function buscarMarkdown(file: string): Promise<string> {
    const resposta = await fetch(file);
    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar o documento: ${file} (${resposta.status})`);
    }
    return resposta.text();
}

export async function loadDocument(id: string): Promise<LoadedDocument> {
    const cacheado = cache.get(id);
    if (cacheado) return cacheado;

    const emAndamento = inflight.get(id);
    if (emAndamento) return emAndamento;

    const meta = getDocMeta(id);
    if (!meta) throw new Error(`Documento desconhecido: ${id}`);

    const promise = (async () => {
        const markdown = await buscarMarkdown(meta.file);
        const { html, headings } = await renderizarMarkdown(markdown);
        const documento: LoadedDocument = { meta, markdown, html, headings };
        cache.set(id, documento);
        inflight.delete(id);
        return documento;
    })();

    inflight.set(id, promise);
    return promise;
}

export function getDocument(id: string): LoadedDocument | null {
    return cache.get(id) ?? null;
}

export function getAllDocuments(): DocRegistryItem[] {
    return DOCS_REGISTRY;
}

/** Carrega todos os documentos em segundo plano, sem bloquear a UI. Chamado ao entrar em "Sobre". */
export function preloadAllDocuments(): void {
    DOCS_REGISTRY.forEach((doc) => {
        loadDocument(doc.id).catch((erro) => {
            console.warn(`[eduAssets] Falha ao pré-carregar documento "${doc.id}":`, erro);
        });
    });
}

function extrairTrecho(texto: string, indice: number, tamanho: number = 90): string {
    const inicio = Math.max(0, indice - tamanho / 2);
    const fim = Math.min(texto.length, indice + tamanho / 2);
    const prefixo = inicio > 0 ? '…' : '';
    const sufixo = fim < texto.length ? '…' : '';
    return `${prefixo}${texto.slice(inicio, fim).replace(/\s+/g, ' ').trim()}${sufixo}`;
}

export function searchDocuments(query: string): SearchResultado[] {
    const termo = query.trim().toLowerCase();
    if (!termo) return [];

    const resultados: SearchResultado[] = [];

    for (const doc of cache.values()) {
        const textoLower = doc.markdown.toLowerCase();
        const indice = textoLower.indexOf(termo);
        if (indice === -1) continue;

        resultados.push({
            doc: doc.meta,
            trecho: extrairTrecho(doc.markdown, indice)
        });
    }

    return resultados;
}

export function clearCache(): void {
    cache.clear();
    inflight.clear();
}