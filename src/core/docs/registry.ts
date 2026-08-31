import { getIdioma } from '../state/i18nStore.js';

type IdiomaDocumentacao = 'pt' | 'en';

export interface DocRegistryItem {
    id: string;
    title: string;
    icon: string;
    file: string;
    category: 'geral' | 'tecnico';
    version: string;
    updatedAt: string;
}

/**
 * Fonte única de verdade sobre quais documentos existem. Para adicionar um novo
 * documento: crie o .md em public/docs/ e adicione uma entrada aqui — sidebar,
 * busca, TOC e metadata funcionam automaticamente.
 */
interface DocumentoRegistrado extends Omit<DocRegistryItem, 'title' | 'file'> {
    title: Record<IdiomaDocumentacao, string>;
    file: Record<IdiomaDocumentacao, string>;
}

const DOCS_REGISTRY: DocumentoRegistrado[] = [
    {
        id: 'manual-usuario',
        title: { pt: 'Manual do Usuário', en: 'User Manual' },
        icon: 'auto_stories',
        file: { pt: '/docs/MANUAL_USUARIO.md', en: '/docs/USER_MANUAL.md' },
        category: 'geral',
        version: 'v0.9.9',
        updatedAt: '2026-08-25'
    },
    {
        id: 'readme',
        title: { pt: 'README', en: 'README' },
        icon: 'article',
        file: { pt: '/docs/LEIAME.md', en: '/docs/README.md' },
        category: 'geral',
        version: 'v0.9.9',
        updatedAt: '2026-08-25'
    },
    {
        id: 'architecture',
        title: { pt: 'Arquitetura', en: 'Architecture' },
        icon: 'account_tree',
        file: { pt: '/docs/ARQUITETURA.md', en: '/docs/ARCHITECTURE.md' },
        category: 'tecnico',
        version: 'v0.9.9',
        updatedAt: '2026-08-25'
    },
    {
        id: 'database-model',
        title: { pt: 'Modelo de Dados', en: 'Data Model' },
        icon: 'schema',
        file: { pt: '/docs/MODELO_DE_DADOS.md', en: '/docs/DATA_MODEL.md' },
        category: 'tecnico',
        version: 'v0.9.9',
        updatedAt: '2026-08-25'
    },
    {
        id: 'roadmap',
        title: { pt: 'Roadmap', en: 'Roadmap' },
        icon: 'route',
        file: { pt: '/docs/ROADMAP.md', en: '/docs/ROADMAP_EN.md' },
        category: 'geral',
        version: 'v0.9.9',
        updatedAt: '2026-08-25'
    },
    {
        id: 'changelog',
        title: { pt: 'Changelog', en: 'Changelog' },
        icon: 'history',
        file: { pt: '/docs/CHANGELOG.md', en: '/docs/CHANGELOG_EN.md' },
        category: 'geral',
        version: 'v0.9.9',
        updatedAt: '2026-08-25'
    }
];

export function getDocMeta(id: string, idioma: IdiomaDocumentacao = getIdioma()): DocRegistryItem | undefined {
    const doc = DOCS_REGISTRY.find((item) => item.id === id);
    return doc && { ...doc, title: doc.title[idioma], file: doc.file[idioma] };
}

export function getDocsRegistry(idioma: IdiomaDocumentacao = getIdioma()): DocRegistryItem[] {
    return DOCS_REGISTRY.map((doc) => ({ ...doc, title: doc.title[idioma], file: doc.file[idioma] }));
}
