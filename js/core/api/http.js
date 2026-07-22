import { API_BASE_URL } from './apiConfig.js';

export class ApiError extends Error {
    constructor(message, status, payload) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.payload = payload;
    }
}

async function request(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const temConteudo = response.status !== 204;
    const payload = temConteudo ? await response.json().catch(() => null) : null;

    if (!response.ok) {
        const mensagem = payload?.erro || `Erro ${response.status} ao comunicar com a API`;
        throw new ApiError(mensagem, response.status, payload);
    }

    return payload;
}

export const http = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
    delete: (path) => request(path, { method: 'DELETE' })
};