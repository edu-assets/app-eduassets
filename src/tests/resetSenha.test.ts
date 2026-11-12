import { describe, it, expect, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({ redefinirSenhaUsuario: vi.fn() }));

vi.mock('../core/api/index.js', () => {
    class ApiError extends Error {
        status: number;
        constructor(message: string, status: number) {
            super(message);
            this.status = status;
        }
    }
    return {
        ApiError,
        categoriasApi: {},
        equipamentosApi: {},
        responsaveisApi: {},
        usuariosApi: { redefinirSenhaUsuario: apiMocks.redefinirSenhaUsuario }
    };
});
vi.mock('../core/state/i18nStore.js', () => ({ t: (chave: string) => chave }));

import { validarNovaSenha, redefinirSenhaUsuario } from '../features/cadastros/service.js';
import { ApiError } from '../core/api/index.js';

describe('validarNovaSenha', () => {
    it('aceita uma senha que atende à política da API', () => {
        expect(validarNovaSenha('Temporaria#2026', 'Temporaria#2026')).toBeNull();
    });

    it('exige os dois campos e confirmação igual', () => {
        expect(validarNovaSenha('', '')).toBe('validation.seguranca.preencha_campos');
        expect(validarNovaSenha('Temporaria#2026', 'Temporaria#2027')).toBe('validation.seguranca.confirmacao_incorreta');
    });

    it.each([
        ['curta', 'Curta#1'],
        ['sem maiúscula', 'temporaria#2026'],
        ['sem minúscula', 'TEMPORARIA#2026'],
        ['sem número', 'Temporaria#abcd'],
        ['sem símbolo', 'Temporaria2026'],
        ['acima de 72 bytes', `Aa1#${'é'.repeat(40)}`]
    ])('rejeita senha %s', (_caso, senha) => {
        expect(validarNovaSenha(senha, senha)).toBe('validation.cadastros.senha_fraca');
    });
});

describe('redefinirSenhaUsuario', () => {
    it('envia a nova senha para o endpoint administrativo', async () => {
        apiMocks.redefinirSenhaUsuario.mockResolvedValueOnce(undefined);
        await redefinirSenhaUsuario(7, 'Temporaria#2026');
        expect(apiMocks.redefinirSenhaUsuario).toHaveBeenCalledWith(7, 'Temporaria#2026');
    });

    it('propaga a mensagem traduzida da API', async () => {
        apiMocks.redefinirSenhaUsuario.mockRejectedValueOnce(new ApiError('Usuário não encontrado.', 404, null));
        await expect(redefinirSenhaUsuario(99, 'Temporaria#2026')).rejects.toThrow('Usuário não encontrado.');
    });
});
