import { openModal, closeModal } from '../../core/ui/index.js';
import { showToast } from '../../core/ui/index.js';
import { getAllDocuments, loadDocument, preloadAllDocuments, searchDocuments } from '../../core/docs/docsService.js';
import type { LoadedDocument } from '../../core/docs/docsService.js';
import { iniciarScrollSpy, scrollParaSecao } from '../../core/docs/toc.js';
import { renderSidebar, renderFooterMetadata, renderToc, renderSearchResults } from './documentationTemplates.js';

const MODAL_ID = 'modal-documentacao';

interface DocumentationEls {
    overlay: HTMLElement;
    sidebar: HTMLElement;
    searchInput: HTMLInputElement;
    searchResults: HTMLElement;
    title: HTMLElement;
    conteudo: HTMLElement;
    toc: HTMLElement;
    footer: HTMLElement;
    btnFechar: HTMLElement | null;
}

let els: DocumentationEls | null = null;
let docAtivoId: string | null = null;
let pararScrollSpy: (() => void) | null = null;
let preloadIniciado = false;

function getEls(): DocumentationEls | null {
    if (els) return els;

    const overlay = document.getElementById(MODAL_ID);
    if (!overlay) return null;

    els = {
        overlay,
        sidebar: overlay.querySelector('#doc-sidebar') as HTMLElement,
        searchInput: overlay.querySelector('#doc-search-input') as HTMLInputElement,
        searchResults: overlay.querySelector('#doc-search-results') as HTMLElement,
        title: overlay.querySelector('#doc-content-title') as HTMLElement,
        conteudo: overlay.querySelector('#doc-content-body') as HTMLElement,
        toc: overlay.querySelector('#doc-toc-wrap') as HTMLElement,
        footer: overlay.querySelector('#doc-footer-wrap') as HTMLElement,
        btnFechar: overlay.querySelector('#doc-fechar')
    };

    attachEvents(els);
    return els;
}

function attachEvents(e: DocumentationEls): void {
    e.sidebar.addEventListener('click', (ev) => {
        const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-doc-id]');
        if (!btn) return;
        abrirDocumento(btn.dataset.docId as string);
    });

    e.searchResults.addEventListener('click', (ev) => {
        const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-doc-id]');
        if (!btn) return;
        e.searchInput.value = '';
        e.searchResults.innerHTML = '';
        e.searchResults.style.display = 'none';
        abrirDocumento(btn.dataset.docId as string);
    });

    e.searchInput.addEventListener('input', () => {
        const query = e.searchInput.value;
        if (!query.trim()) {
            e.searchResults.style.display = 'none';
            e.searchResults.innerHTML = '';
            return;
        }
        const resultados = searchDocuments(query);
        e.searchResults.innerHTML = renderSearchResults(resultados);
        e.searchResults.style.display = 'block';
    });

    e.toc.addEventListener('click', (ev) => {
        const link = (ev.target as HTMLElement).closest<HTMLElement>('[data-toc-target]');
        if (!link) return;
        ev.preventDefault();
        scrollParaSecao(e.conteudo, link.dataset.tocTarget as string);
    });

    e.conteudo.addEventListener('click', (ev) => {
        const btnCopiar = (ev.target as HTMLElement).closest<HTMLElement>('.doc-code-copy-btn');
        if (!btnCopiar) return;
        const pre = btnCopiar.closest('pre');
        const codigo = pre?.querySelector('code')?.textContent ?? '';
        navigator.clipboard.writeText(codigo)
            .then(() => showToast('Código copiado', 'success'))
            .catch(() => showToast('Não foi possível copiar', 'warning'));
    });

    if (e.btnFechar) {
        e.btnFechar.addEventListener('click', () => closeModal(MODAL_ID));
    }
}

async function abrirDocumento(id: string): Promise<void> {
    const e = getEls();
    if (!e) return;

    docAtivoId = id;
    e.sidebar.innerHTML = renderSidebar(getAllDocuments(), docAtivoId);

    e.title.textContent = 'Carregando...';
    e.conteudo.innerHTML = '<div class="doc-loading">Carregando documento...</div>';
    e.toc.innerHTML = '';
    e.footer.innerHTML = '';

    let doc: LoadedDocument;
    try {
        doc = await loadDocument(id);
    } catch (erro) {
        e.conteudo.innerHTML = `<div class="doc-error">Não foi possível carregar este documento.</div>`;
        showToast(erro instanceof Error ? erro.message : 'Erro ao carregar documento.', 'error');
        return;
    }

    if (docAtivoId !== id) return; 

    e.title.textContent = doc.meta.title;
    e.conteudo.innerHTML = doc.html;
    e.conteudo.scrollTop = 0;
    e.toc.innerHTML = renderToc(doc);
    e.footer.innerHTML = renderFooterMetadata(doc);

    if (pararScrollSpy) pararScrollSpy();
    pararScrollSpy = iniciarScrollSpy(e.conteudo, e.toc, doc.headings);
}

export function abrirDocumentacao(docId: string = 'manual-usuario'): void {
    const e = getEls();
    if (!e) return;

    preloadAllDocuments();
    openModal(MODAL_ID);
    abrirDocumento(docId);
}

export function initDocumentation(): void {
    const painelSobre = document.getElementById('panel-sobre');
    if (!painelSobre) return;

    const acionarPreload = () => {
        if (preloadIniciado) return;
        preloadIniciado = true;
        preloadAllDocuments();
    };

    if (painelSobre.classList.contains('active')) acionarPreload();

    document.addEventListener('click', (e) => {
        const link = (e.target as HTMLElement).closest<HTMLElement>('.nav-link[data-panel="panel-sobre"]');
        if (link) acionarPreload();
    });

    document.querySelectorAll<HTMLElement>('[data-abrir-doc]').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            abrirDocumentacao(el.dataset.abrirDoc || 'manual-usuario');
        });
    });
}