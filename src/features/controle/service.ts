import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { addOcorrencia, updateOcorrencia, deleteOcorrencia, resolveOcorrencia } from '../../core/state/ocorrenciasStore.js';
import type { TipoOcorrencia, ControleRegistroDados, OcorrenciaUpdatePayload } from '../../types/index.js';

const TIPO_API_MAP: Record<string, TipoOcorrencia> = {
    observacao: 'OBSERVACAO',
    manutencao: 'MANUTENCAO',
    quebrado: 'QUEBRADO'
};

export function mapTipoApi(tipo: string): TipoOcorrencia {
    return TIPO_API_MAP[tipo] || 'OBSERVACAO';
}

export function resolverEquipamentoId(categoria: string, modelo: string): number | null {
    const categoriaNormalizada = String(categoria || '').trim().toLowerCase();
    const modeloNormalizado = String(modelo || '').trim().toLowerCase();

    const equipamento = getEquipamentos().find((item) => {
        const categoriaItem = String(item.categoria?.nome ?? '').trim().toLowerCase();
        const modeloItem = String(item.modelo ?? '').trim().toLowerCase();
        return categoriaItem === categoriaNormalizada && modeloItem === modeloNormalizado;
    });

    return equipamento?.id ?? null;
}

export async function adicionarRegistro(tipo: string, dados: ControleRegistroDados): Promise<void> {
    const equipamentoId = resolverEquipamentoId(dados.categoria, dados.modelo);
    if (!equipamentoId) {
        throw new Error('Não foi possível localizar um equipamento correspondente para salvar o registro.');
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

export function listarModelosPorCategoria(categoriaNome: string | null): string[] {
    const modelosUnicos = new Map<string, boolean>();
    getEquipamentos()
        .filter((equipamento) => equipamento.categoria?.nome === categoriaNome)
        .forEach((equipamento) => {
            if (!modelosUnicos.has(equipamento.modelo)) modelosUnicos.set(equipamento.modelo, true);
        });
    return [...modelosUnicos.keys()].sort();
}