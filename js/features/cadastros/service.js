import {
    categoriasApi,
    equipamentosApi,
    responsaveisApi,
    usuariosApi,
    ApiError
} from '../../core/api/index.js';

/*
 * CADASTRO_CONFIG mora aqui por enquanto (aprovado). Se crescer bastante
 * (novos tipos, campos condicionais, regras por tipo), extrair para
 * cadastroConfig.js e importar aqui.
 */
const CADASTRO_CONFIG = {
    equipamentos: {
        titulo: 'Equipamentos',
        listar: () => equipamentosApi.listarEquipamentos(),
        criar: (valores) => equipamentosApi.criarEquipamento({
            categoriaId: Number(valores['cad-categoria']),
            modelo: valores['cad-modelo'],
            quantidadeTotal: Number(valores['cad-quantidade'])
        }),
        formatarItem: (item) => `${item.categoria?.nome ?? '—'} — ${item.modelo} (${item.quantidadeDisponivel}/${item.quantidadeTotal})`,
        campos: [
            {
                id: 'cad-categoria',
                label: 'Categoria',
                type: 'select',
                carregarOpcoes: () => categoriasApi.listarCategorias()
                    .then((categorias) => categorias.map((c) => ({ value: c.id, label: c.nome })))
            },
            { id: 'cad-modelo', label: 'Modelo', type: 'text', placeholder: 'Ex: Multilaser' },
            { id: 'cad-quantidade', label: 'Quantidade', type: 'number', placeholder: '1' }
        ]
    },
    responsaveis: {
        titulo: 'Responsáveis',
        listar: () => responsaveisApi.listarResponsaveis(),
        criar: (valores) => responsaveisApi.criarResponsavel({
            nome: valores['cad-nome'],
            cargo: valores['cad-cargo']
        }),
        formatarItem: (item) => `${item.nome} — ${item.cargo}`,
        campos: [
            { id: 'cad-nome', label: 'Nome', type: 'text', placeholder: 'Nome completo' },
            { id: 'cad-cargo', label: 'Cargo', type: 'text', placeholder: 'Ex: Professor' }
        ]
    },
    usuarios: {
        titulo: 'Usuários do Sistema',
        listar: () => usuariosApi.listarUsuarios(),
        criar: (valores) => usuariosApi.criarUsuario({
            nome: valores['cad-nome-usuario'],
            login: valores['cad-login-usuario'],
            nivelAcesso: valores['cad-nivel-acesso']
        }),
        formatarItem: (item) => `${item.nome} — ${item.login} · ${item.nivelAcesso === 'ADMINISTRADOR' ? 'Administrador' : 'Editor'}`,
        campos: [
            { id: 'cad-nome-usuario', label: 'Nome', type: 'text', placeholder: 'Nome completo' },
            { id: 'cad-login-usuario', label: 'E-mail / Login', type: 'text', placeholder: 'usuario@escola.com' },
            {
                id: 'cad-nivel-acesso',
                label: 'Nível de acesso',
                type: 'select',
                options: [
                    { value: 'ADMINISTRADOR', label: 'Administrador' },
                    { value: 'EDITOR', label: 'Editor' }
                ]
            }
        ]
    },
    categorias: {
        titulo: 'Categorias de Equipamentos',
        listar: () => categoriasApi.listarCategorias(),
        criar: (valores) => categoriasApi.criarCategoria(valores['cad-nome-categoria']),
        formatarItem: (item) => item.nome,
        campos: [
            { id: 'cad-nome-categoria', label: 'Nome da Categoria', type: 'text', placeholder: 'Ex: Notebook' }
        ]
    }
};

export function getConfig(tipo) {
    return CADASTRO_CONFIG[tipo] ?? null;
}

export async function listarRegistros(tipo) {
    const config = getConfig(tipo);
    if (!config) return [];

    try {
        return await config.listar();
    } catch (erro) {
        throw new Error(erro instanceof ApiError ? erro.message : 'Erro ao carregar registros.');
    }
}

export async function criarRegistro(tipo, valores) {
    const config = getConfig(tipo);
    if (!config) throw new Error('Tipo de cadastro inválido.');

    try {
        await config.criar(valores);
    } catch (erro) {
        throw new Error(erro instanceof ApiError ? erro.message : 'Erro ao salvar registro.');
    }
}

export async function carregarOpcoesCampo(campo) {
    if (campo.type !== 'select') return null;

    const opcoesBrutas = campo.carregarOpcoes ? await campo.carregarOpcoes() : campo.options;
    return opcoesBrutas.map((op) => (typeof op === 'object' ? op : { value: op, label: op }));
}

export function formatarItem(tipo, item) {
    const config = getConfig(tipo);
    return config ? config.formatarItem(item) : '';
}