import { getEquipamentos } from '../../core/state/equipamentoStore.js';
import { addOcorrencia, updateOcorrencia, deleteOcorrencia } from '../../core/state/ocorrenciasStore.js';

const TIPO_API_MAP = {
    observacao: 'OBSERVACAO',
    manutencao: 'MANUTENCAO',
    quebrado: 'QUEBRADO'
};

export function mapTipoApi(tipo) {
    return TIPO_API_MAP[tipo] || 'OBSERVACAO';
}

export function resolverEquipamentoId(categoria, modelo) {
    const categoriaNormalizada = String(categoria || '').trim().toLowerCase();
    const modeloNormalizado = String(modelo || '').trim().toLowerCase();

    const equipamento = getEquipamentos().find((item) => {
        const categoriaItem = String(item.categoria?.nome ?? '').trim().toLowerCase();
        const modeloItem = String(item.modelo ?? '').trim().toLowerCase();
        return categoriaItem === categoriaNormalizada && modeloItem === modeloNormalizado;
    });

    return equipamento?.id ?? null;
}

export async function adicionarRegistro(tipo, dados) {
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

export async function editarRegistro(id, tipo, dados) {
    const payload = {
        problema: dados.problema,
        descricao: dados.descricao,
        numero: dados.numero
    };

    if (tipo === 'resolvidos' && dados.medidas !== undefined) {
        payload.medidasTomadas = dados.medidas;
    }

    await updateOcorrencia(Number(id), payload);
}

export async function removerRegistro(id) {
    await deleteOcorrencia(Number(id));
}