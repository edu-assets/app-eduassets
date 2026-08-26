import type { DocRegistryItem } from '../../core/docs/registry.js';
import type { LoadedDocument, SearchResultado } from '../../core/docs/docsService.js';
import { renderTocHtml } from '../../core/docs/toc.js';
import { t } from '../../core/state/i18nStore.js';

export function renderSidebarItem(doc: DocRegistryItem, ativo: boolean): string {
    return `
        <button type="button" class="doc-sidebar-item${ativo ? ' active' : ''}" data-doc-id="${doc.id}">
            <span class="material-symbols-outlined">${doc.icon}</span>
            <span class="doc-sidebar-item-label">${doc.title}</span>
        </button>
    `;
}

export function renderSidebar(docs: DocRegistryItem[], docAtivoId: string | null): string {
    return docs.map((doc) => renderSidebarItem(doc, doc.id === docAtivoId)).join('');
}

export function renderFooterMetadata(doc: LoadedDocument): string {
    return `
        <div class="doc-footer">
            <span><strong>${t('docs.versao')}</strong> ${doc.meta.version}</span>
            <span><strong>${t('docs.atualizado_em')}</strong> ${doc.meta.updatedAt}</span>
            <span><strong>${t('docs.fonte')}</strong> ${doc.meta.file.split('/').pop()}</span>
        </div>
    `;
}

export function renderToc(doc: LoadedDocument): string {
    const itens = renderTocHtml(doc.headings);
    if (!itens) return '';

    return `
        <div class="doc-toc" id="doc-toc">
            <span class="doc-toc-title">${t('docs.nesta_pagina')}</span>
            ${itens}
        </div>
    `;
}

export function renderSearchResults(resultados: SearchResultado[]): string {
    if (!resultados.length) {
        return `<div class="doc-search-empty">${t('docs.nenhum_resultado')}</div>`;
    }

    return resultados.map((r) => `
        <button type="button" class="doc-search-result" data-doc-id="${r.doc.id}">
            <span class="material-symbols-outlined">${r.doc.icon}</span>
            <span class="doc-search-result-body">
                <span class="doc-search-result-title">${r.doc.title}</span>
                <span class="doc-search-result-snippet">${r.trecho}</span>
            </span>
        </button>
    `).join('');
}
