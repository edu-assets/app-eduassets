import { describe, expect, it } from 'vitest';
import { caminhoIconeEquipamento, caminhoIlustracao, renderIconeEquipamento, renderIlustracao } from '../shared/components/kitVisual.js';

describe('kit visual', () => {
    it('escolhe o ícone pela categoria, sem depender de acento ou maiúsculas', () => {
        expect(caminhoIconeEquipamento('Notebook')).toBe('/assets/kit/equipamentos/notebook.svg');
        expect(caminhoIconeEquipamento('Fone de ouvido')).toBe('/assets/kit/equipamentos/fone.svg');
        expect(caminhoIconeEquipamento('Fonte de carregamento')).toBe('/assets/kit/equipamentos/carregador.svg');
        expect(caminhoIconeEquipamento('Carregador USB')).toBe('/assets/kit/equipamentos/carregador.svg');
        expect(caminhoIconeEquipamento('CÂMERA DIGITAL')).toBe('/assets/kit/equipamentos/camera.svg');
        expect(caminhoIconeEquipamento('Webcam HD')).toBe('/assets/kit/equipamentos/webcam.svg');
        expect(caminhoIconeEquipamento('Extensão elétrica')).toBe('/assets/kit/equipamentos/extensao.svg');
        expect(caminhoIconeEquipamento('Caixa de som')).toBe('/assets/kit/equipamentos/caixa-de-som.svg');
    });

    it('categoria desconhecida ou vazia não ganha ícone', () => {
        expect(caminhoIconeEquipamento('Microscópio')).toBeNull();
        expect(caminhoIconeEquipamento('')).toBeNull();
        expect(caminhoIconeEquipamento(undefined)).toBeNull();
        expect(renderIconeEquipamento('Microscópio', 'x')).toBe('');
    });

    it('ilustrações e ícones são decorativos (alt vazio) e têm tamanho reservado', () => {
        expect(caminhoIlustracao('tudoDevolvido')).toBe('/assets/kit/ilustracoes/tudo-devolvido.svg');
        const ilustracao = renderIlustracao('erroConexao', true);
        expect(ilustracao).toContain('alt=""');
        expect(ilustracao).toContain('estado-ilustracao--sm');
        expect(ilustracao).toContain('width="240" height="180"');
        expect(renderIconeEquipamento('Tablet', 'estoque-icone')).toContain('class="estoque-icone"');
    });
});
