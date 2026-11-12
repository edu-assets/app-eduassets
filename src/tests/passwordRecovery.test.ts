import { describe, expect, it, vi } from 'vitest';

vi.mock('../core/api/auth.js', () => ({ solicitarRecuperacaoSenha: vi.fn(), redefinirSenhaComToken: vi.fn() }));
vi.mock('../core/api/apiClient.js', () => ({ supportsPasswordRecovery: vi.fn(async () => true) }));
vi.mock('../core/state/authStore.js', () => ({ isAutenticado: () => false }));
vi.mock('../core/state/i18nStore.js', () => ({ t: (key: string) => key, traduzirErro: (_e: unknown, key: string) => key, getIdioma: () => 'pt' }));
vi.mock('../core/ui/index.js', () => ({ showToast: vi.fn() }));
vi.mock('../features/cadastros/service.js', () => ({ validarNovaSenha: () => null }));

const { extrairTokenRecuperacao, consumirTokenRecuperacaoDaUrl } = await import('../features/auth/passwordRecovery.js');

const TOKEN = 'A'.repeat(21) + '_-' + 'b'.repeat(20);

describe('password recovery link handling', () => {
    it('accepts only a 43-character URL-safe token in the fragment', () => {
        expect(extrairTokenRecuperacao(`#redefinir-senha=${TOKEN}`)).toBe(TOKEN);
        expect(extrairTokenRecuperacao('#redefinir-senha=short')).toBeNull();
        expect(extrairTokenRecuperacao(`#redefinir-senha=${TOKEN}x`)).toBeNull();
        expect(extrairTokenRecuperacao(`#login`)).toBeNull();
    });

    it('removes the token from the address bar and history after reading it', () => {
        const replaceState = vi.fn();
        vi.stubGlobal('window', {
            location: { hash: `#redefinir-senha=${TOKEN}`, pathname: '/', search: '' },
            history: { state: null, replaceState },
        });
        expect(consumirTokenRecuperacaoDaUrl()).toBe(TOKEN);
        expect(replaceState).toHaveBeenCalledWith(null, '', '/#login');
        vi.unstubAllGlobals();
    });

    it('leaves other routes untouched', () => {
        const replaceState = vi.fn();
        vi.stubGlobal('window', { location: { hash: '#app', pathname: '/', search: '' }, history: { state: null, replaceState } });
        expect(consumirTokenRecuperacaoDaUrl()).toBeNull();
        expect(replaceState).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
    });
});
