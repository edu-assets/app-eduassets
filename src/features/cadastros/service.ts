import {
    categoriasApi,
    equipamentosApi,
    responsaveisApi,
    usuariosApi,
    ApiError
} from '../../core/api/index.js';
import type { Categoria, Equipamento, Responsavel, Usuario } from '../../types/index.js';

export interface CampoOpcao {
    value: string | number;
    label: string;
}

export interface CampoCadastro {
    id: string;
    label: string;
    type: string;
    placeholder?: string;
    options?: Array<CampoOpcao | string>;
    carregarOpcoes?: () => Promise<CampoOpcao[]>;
}

export interface CadastroConfig<T = unknown> {
    titulo: string;
    descricao: string;
    icone: string;
    iconeClasse: string;
    listar: () => Promise<T[]>;
    criar: (valores: Record<string, string>) => Promise<unknown>;
    formatarItem: (item: T) => string;
    campos: CampoCadastro[];
}

export type TipoCadastro = 'equipamentos' | 'responsaveis' | 'usuarios' | 'categorias';

const CADASTRO_CONFIG: Record<TipoCadastro, CadastroConfig<any>> = {
    equipamentos: {
        titulo: 'Equipamentos',
        descricao: 'Adicione um novo equipamento à lista disponível para empréstimo.',
        icone: 'devices',
        iconeClasse: 'primary',
        listar: () => equipamentosApi.listarEquipamentos(),
        criar: (valores) => equipamentosApi.criarEquipamento({
            categoriaId: Number(valores['cad-categoria']),
            modelo: valores['cad-modelo'],
            quantidadeTotal: Number(valores['cad-quantidade'])
        }),
        formatarItem: (item: Equipamento) => `${item.categoria?.nome ?? '—'} — ${item.modelo} (${item.quantidadeDisponivel}/${item.quantidadeTotal})`,
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
        descricao: 'Cadastre um professor ou funcionário autorizado a retirar equipamentos.',
        icone: 'badge',
        iconeClasse: 'success',
        listar: () => responsaveisApi.listarResponsaveis(),
        criar: (valores) => responsaveisApi.criarResponsavel({
            nome: valores['cad-nome'],
            cargo: valores['cad-cargo']
        }),
        formatarItem: (item: Responsavel) => `${item.nome} — ${item.cargo}`,
        campos: [
            { id: 'cad-nome', label: 'Nome', type: 'text', placeholder: 'Nome completo' },
            { id: 'cad-cargo', label: 'Cargo', type: 'text', placeholder: 'Ex: Professor' }
        ]
    },
    usuarios: {
        titulo: 'Usuários do Sistema',
        descricao: 'Adicione um novo usuário com acesso ao sistema.',
        icone: 'admin_panel_settings',
        iconeClasse: 'secondary',
        listar: () => usuariosApi.listarUsuarios(),
        criar: (valores) => usuariosApi.criarUsuario({
            nome: valores['cad-nome-usuario'],
            login: valores['cad-login-usuario'],
            senha: valores['cad-senha-usuario'],
            nivelAcesso: valores['cad-nivel-acesso'] as Usuario['nivelAcesso']
        }),
        formatarItem: (item: Usuario) => `${item.nome} — ${item.login} · ${item.nivelAcesso === 'ADMINISTRADOR' ? 'Administrador' : 'Editor'}`,
        campos: [
            { id: 'cad-nome-usuario', label: 'Nome', type: 'text', placeholder: 'Nome completo' },
            { id: 'cad-login-usuario', label: 'E-mail / Login', type: 'text', placeholder: 'usuario@escola.com' },
            { id: 'cad-senha-usuario', label: 'Senha', type: 'password', placeholder: 'Mínimo 8 caracteres' },
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
        descricao: 'Crie uma nova categoria para organizar os equipamentos.',
        icone: 'category',
        iconeClasse: 'info',
        listar: () => categoriasApi.listarCategorias(),
        criar: (valores) => categoriasApi.criarCategoria(valores['cad-nome-categoria']),
        formatarItem: (item: Categoria) => item.nome,
        campos: [
            { id: 'cad-nome-categoria', label: 'Nome da Categoria', type: 'text', placeholder: 'Ex: Notebook' }
        ]
    }
};

export function getConfig(tipo: string | null | undefined): CadastroConfig | null {
    if (!tipo || !(tipo in CADASTRO_CONFIG)) return null;
    return CADASTRO_CONFIG[tipo as TipoCadastro];
}

export async function listarRegistros(tipo: string | null): Promise<unknown[]> {
    const config = getConfig(tipo);
    if (!config) return [];

    try {
        return await config.listar();
    } catch (erro) {
        throw new Error(erro instanceof ApiError ? erro.message : 'Erro ao carregar registros.');
    }
}

export async function criarRegistro(tipo: string | null, valores: Record<string, string>): Promise<void> {
    const config = getConfig(tipo);
    if (!config) throw new Error('Tipo de cadastro inválido.');

    try {
        await config.criar(valores);
    } catch (erro) {
        throw new Error(erro instanceof ApiError ? erro.message : 'Erro ao salvar registro.');
    }
}

export async function carregarOpcoesCampo(campo: CampoCadastro): Promise<CampoOpcao[] | null> {
    if (campo.type !== 'select') return null;

    const opcoesBrutas: Array<CampoOpcao | string> = campo.carregarOpcoes
        ? await campo.carregarOpcoes()
        : (campo.options ?? []);

    return opcoesBrutas.map((op) => (typeof op === 'object' ? op : { value: op, label: op }));
}

export function formatarItem(tipo: string | null, item: unknown): string {
    const config = getConfig(tipo);
    return config ? config.formatarItem(item) : '';
}