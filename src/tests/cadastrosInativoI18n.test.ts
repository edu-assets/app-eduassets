// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

vi.mock('../core/state/i18nStore.js', () => ({
    t: (k: string) => ({ 'cadastros.inativo': 'Inactive', 'cadastros.editor': 'Editor', 'cadastros.administrador': 'Administrator' } as Record<string, string>)[k] ?? k
}));

import { textoBuscaUsuario } from '../features/cadastros/service.js';
import { textoResponsavel } from '../features/cadastros/templates.js';

describe('busca de inativos localizada', () => {
    it('usa o texto traduzido', () => {
        expect(textoBuscaUsuario({ nome: 'A', login: 'a', nivelAcesso: 'EDITOR', ativo: false } as never)).toContain('Inactive');
        expect(textoResponsavel({ nome: 'B', cargo: 'C', ativo: false } as never)).toContain('Inactive');
        expect(textoResponsavel({ nome: 'B', cargo: 'C', ativo: false } as never)).not.toContain('Inativo');
    });
});
