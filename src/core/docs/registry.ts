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
 * documento: crie os Markdown localizados em public/docs/ e adicione uma entrada
 * aqui — cards da página Sobre, sidebar, busca, TOC e metadados usam este catálogo.
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
        version: 'Beta',
        updatedAt: '2026-10-27'
    },
    {
        id: 'readme',
        title: { pt: 'README', en: 'README' },
        icon: 'article',
        file: { pt: '/docs/LEIAME.md', en: '/docs/README.md' },
        category: 'geral',
        version: 'Beta',
        updatedAt: '2026-10-27'
    },
    {
        id: 'architecture',
        title: { pt: 'Arquitetura', en: 'Architecture' },
        icon: 'account_tree',
        file: { pt: '/docs/ARQUITETURA.md', en: '/docs/ARCHITECTURE.md' },
        category: 'tecnico',
        version: 'Beta',
        updatedAt: '2026-10-27'
    },
    {
        id: 'hosting',
        title: { pt: 'Hospedagem', en: 'Hosting' },
        icon: 'cloud',
        file: { pt: '/docs/Hospedagem.md', en: '/docs/Hosting.md' },
        category: 'tecnico',
        version: 'Beta',
        updatedAt: '2026-10-23'
    },
    {
        id: 'database-model',
        title: { pt: 'Modelo de Dados', en: 'Data Model' },
        icon: 'schema',
        file: { pt: '/docs/MODELO_DE_DADOS.md', en: '/docs/DATA_MODEL.md' },
        category: 'tecnico',
        version: 'Beta',
        updatedAt: '2026-10-27'
    },
    {
        id: 'roadmap',
        title: { pt: 'Roadmap', en: 'Roadmap' },
        icon: 'route',
        file: { pt: '/docs/ROADMAP.md', en: '/docs/ROADMAP_EN.md' },
        category: 'geral',
        version: 'Beta',
        updatedAt: '2026-10-27'
    },
    {
        id: 'changelog',
        title: { pt: 'Changelog', en: 'Changelog' },
        icon: 'history',
        file: { pt: '/docs/CHANGELOG.md', en: '/docs/CHANGELOG_EN.md' },
        category: 'geral',
        version: 'Beta',
        updatedAt: '2026-10-27'
    },
    {
        id: 'api-reference',
        title: { pt: 'Referência da API', en: 'API Reference' },
        icon: 'api',
        file: { pt: '/docs/REFERENCIA_API.md', en: '/docs/API_REFERENCE.md' },
        category: 'tecnico',
        version: 'Beta',
        updatedAt: '2026-10-27'
    },
    {
        id: 'development',
        title: { pt: 'Desenvolvimento', en: 'Development' },
        icon: 'code',
        file: { pt: '/docs/DESENVOLVIMENTO.md', en: '/docs/DEVELOPMENT.md' },
        category: 'tecnico',
        version: 'Beta',
        updatedAt: '2026-10-27'
    },
    {
        id: 'deployment',
        title: { pt: 'Guia de Implantação', en: 'Deployment Guide' },
        icon: 'rocket_launch',
        file: { pt: '/docs/GUIA_IMPLANTACAO.md', en: '/docs/DEPLOYMENT.md' },
        category: 'tecnico',
        version: 'Beta',
        updatedAt: '2026-10-27'
    },
    {
        id: 'operations-recovery',
        title: { pt: 'Operação e Recuperação', en: 'Operations and Recovery' },
        icon: 'health_and_safety',
        file: { pt: '/docs/OPERACAO_E_RECUPERACAO.md', en: '/docs/OPERATIONS_AND_RECOVERY.md' },
        category: 'tecnico',
        version: 'Beta',
        updatedAt: '2026-10-27'
    }
];

export function getDocMeta(id: string, idioma: IdiomaDocumentacao = getIdioma()): DocRegistryItem | undefined {
    const doc = DOCS_REGISTRY.find((item) => item.id === id);
    return doc && { ...doc, title: doc.title[idioma], file: doc.file[idioma] };
}

export function getDocsRegistry(idioma: IdiomaDocumentacao = getIdioma()): DocRegistryItem[] {
    return DOCS_REGISTRY.map((doc) => ({ ...doc, title: doc.title[idioma], file: doc.file[idioma] }));
}
