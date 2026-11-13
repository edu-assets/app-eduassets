import type { Autor } from '../../types/index.js';

export type CampoAutor = 'criadoPor' | 'atualizadoPor' | 'devolvidoPor' | 'resolvidoPor';
export type ComAutoria = Partial<Record<CampoAutor, Autor | null>> & { atualizadoEm?: string | null };

const CAMPOS: CampoAutor[] = ['criadoPor', 'atualizadoPor', 'devolvidoPor', 'resolvidoPor'];

function normalizarAutor(valor: unknown): Autor | null {
    if (!valor || typeof valor !== 'object') return null;
    const { id, nome } = valor as Partial<Autor>;
    return typeof nome === 'string' ? { id: Number(id), nome } : null;
}

/** Copia só os campos de autoria presentes na resposta (convidados não os recebem). */
export function extrairAutoria(origem: object): ComAutoria {
    const fonte = origem as Record<string, unknown>;
    const saida: ComAutoria = {};
    CAMPOS.forEach((campo) => {
        if (fonte[campo] !== undefined) saida[campo] = normalizarAutor(fonte[campo]);
    });
    if (fonte.atualizadoEm !== undefined) saida.atualizadoEm = (fonte.atualizadoEm as string | null) ?? null;
    return saida;
}
