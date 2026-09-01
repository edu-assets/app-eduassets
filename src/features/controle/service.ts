import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { addOcorrencia, updateOcorrencia, deleteOcorrencia, resolveOcorrencia } from '../../core/state/ocorrenciasStore.js';
import type { TipoOcorrencia, ControleRegistroDados, OcorrenciaUpdatePayload, OcorrenciaUI } from '../../types/index.js';

const TIPO_API_MAP: Record<string, TipoOcorrencia> = {
    observacao: 'OBSERVACAO',
    manutencao: 'MANUTENCAO',
    quebrado: 'QUEBRADO'
};

export function mapTipoApi(tipo: string): TipoOcorrencia {
    return TIPO_API_MAP[tipo] || 'OBSERVACAO';
}

export interface EquipamentoOpcao {
    id: number;
    modelo: string;
}

export function listarEquipamentosPorCategoria(categoriaNome: string | null): EquipamentoOpcao[] {
    if (!categoriaNome) return [];
    return getEquipamentos()
        .filter((item) => item.categoria?.nome === categoriaNome)
        .map((item) => ({ id: item.id, modelo: item.modelo }));
}

export async function adicionarRegistro(tipo: string, dados: ControleRegistroDados): Promise<void> {
    const equipamentoId = Number(dados.equipamentoId);
    if (!equipamentoId) {
        throw new Error('controle.selecione_equipamento_valido');
    }

    await addOcorrencia({
        equipamentoId,
        tipo: mapTipoApi(tipo),
        problema: dados.problema,
        descricao: dados.descricao,
        numeros: [dados.numero]
    });
}

export async function editarRegistro(id: string | number, tipo: string, dados: ControleRegistroDados): Promise<void> {
    const payload: OcorrenciaUpdatePayload = {
        problema: dados.problema,
        descricao: dados.descricao,
        numero: dados.numero
    };

    if (tipo === 'resolvidos' && dados.medidas !== undefined) {
        payload.medidasTomadas = dados.medidas;
    }

    await updateOcorrencia(Number(id), payload);
}

export async function removerRegistro(id: string | number): Promise<void> {
    await deleteOcorrencia(Number(id));
}

export async function resolverRegistro(id: string | number, medidasTomadas: string): Promise<void> {
    await resolveOcorrencia(Number(id), medidasTomadas);
}

export function listarCategoriasDisponiveis(): string[] {
    const categoriasUnicas = new Map<string, boolean>();
    getEquipamentos().forEach((equipamento) => {
        const nome = equipamento.categoria?.nome;
        if (nome && !categoriasUnicas.has(nome)) categoriasUnicas.set(nome, true);
    });
    return [...categoriasUnicas.keys()].sort();
}

/* ===== Filtering ===== */

export function filtrarOcorrencias(ocorrencias: OcorrenciaUI[], termo: string): OcorrenciaUI[] {
    if (!termo.trim()) return ocorrencias;
    const termoMin = termo.toLowerCase();

    return ocorrencias.filter((o) =>
        (o.categoria || '').toLowerCase().includes(termoMin) ||
        (o.modelo || '').toLowerCase().includes(termoMin) ||
        String(o.numero).toLowerCase().includes(termoMin) ||
        (o.descricao || '').toLowerCase().includes(termoMin) ||
        (o.problema || '').toLowerCase().includes(termoMin)
    );
}