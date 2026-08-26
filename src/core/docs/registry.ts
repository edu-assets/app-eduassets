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
export const DOCS_REGISTRY: DocRegistryItem[] = [
    {
        id: 'manual-usuario',
        title: 'Manual do Usuário',
        icon: 'auto_stories',
        file: '/docs/MANUAL_USUARIO.md',
        category: 'geral',
        version: 'v0.9.9',
        updatedAt: '2026-08-25'
    },
    {
        id: 'readme',
        title: 'README',
        icon: 'article',
        file: '/docs/README.md',
        category: 'geral',
        version: 'v0.9.9',
        updatedAt: '2026-08-25'
    },
    {
        id: 'architecture',
        title: 'Arquitetura',
        icon: 'account_tree',
        file: '/docs/ARQUITETURA.md',
        category: 'tecnico',
        version: 'v0.9.9',
        updatedAt: '2026-08-25'
    },
    {
        id: 'database-model',
        title: 'Modelo de Dados',
        icon: 'schema',
        file: '/docs/MODELO_DE_DADOS.md',
        category: 'tecnico',
        version: 'v0.9.9',
        updatedAt: '2026-08-25'
    },
    {
        id: 'roadmap',
        title: 'Roadmap',
        icon: 'route',
        file: '/docs/ROADMAP.md',
        category: 'geral',
        version: 'v0.9.9',
        updatedAt: '2026-08-25'
    },
    {
        id: 'changelog',
        title: 'Changelog',
        icon: 'history',
        file: '/docs/CHANGELOG.md',
        category: 'geral',
        version: 'v0.9.9',
        updatedAt: '2026-08-25'
    }
];

export function getDocMeta(id: string): DocRegistryItem | undefined {
    return DOCS_REGISTRY.find((doc) => doc.id === id);
}