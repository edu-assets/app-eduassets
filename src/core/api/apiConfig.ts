const configurada = import.meta.env.VITE_API_BASE_URL || '';
if (import.meta.env.PROD && !configurada) {
    throw new Error('VITE_API_BASE_URL é obrigatória para o build de produção e deve apontar para a API.');
}
export const API_BASE_URL: string = configurada;
