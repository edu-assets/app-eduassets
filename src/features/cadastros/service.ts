import {
    categoriasApi,
    equipamentosApi,
    responsaveisApi,
    usuariosApi,
    ApiError
} from '../../core/api/index.js';
import type { Categoria, Equipamento, Responsavel, Usuario } from '../../types/index.js';
import { t } from '../../core/state/i18nStore.js';

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
        titulo: 'cadastros.titulo_equipamentos',
        descricao: 'cadastros.desc_equipamentos',
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
                label: 'cadastros.campo_categoria',
                type: 'select',
                carregarOpcoes: () => categoriasApi.listarCategorias()
                    .then((categorias) => categorias.map((c) => ({ value: c.id, label: c.nome }))) // dado real, não traduzir
            },
            { id: 'cad-modelo', label: 'cadastros.campo_modelo', type: 'text', placeholder: 'cadastros.placeholder_modelo' },
            { id: 'cad-quantidade', label: 'cadastros.campo_quantidade', type: 'number', placeholder: '1' }
        ]
    },
    responsaveis: {
        titulo: 'cadastros.titulo_responsaveis',
        descricao: 'cadastros.desc_responsaveis',
        icone: 'badge',
        iconeClasse: 'success',
        listar: () => responsaveisApi.listarResponsaveis(),
        criar: (valores) => responsaveisApi.criarResponsavel({
            nome: valores['cad-nome'],
            cargo: valores['cad-cargo']
        }),
        formatarItem: (item: Responsavel) => `${item.nome} — ${item.cargo}`,
        campos: [
            { id: 'cad-nome', label: 'cadastros.campo_nome', type: 'text', placeholder: 'cadastros.placeholder_nome_completo' },
            { id: 'cad-cargo', label: 'cadastros.campo_cargo', type: 'text', placeholder: 'cadastros.placeholder_cargo' }
        ]
    },
    usuarios: {
        titulo: 'cadastros.titulo_usuarios',
        descricao: 'cadastros.desc_usuarios',
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
            { id: 'cad-nome-usuario', label: 'cadastros.campo_nome', type: 'text', placeholder: 'cadastros.placeholder_nome_completo' },
            { id: 'cad-login-usuario', label: 'cadastros.campo_email_login', type: 'text', placeholder: 'cadastros.placeholder_email' },
            { id: 'cad-senha-usuario', label: 'cadastros.campo_senha', type: 'password', placeholder: 'cadastros.placeholder_senha' },
            {
                id: 'cad-nivel-acesso',
                label: 'cadastros.campo_nivel_acesso',
                type: 'select',
                options: [
                    { value: 'ADMINISTRADOR', label: 'cadastros.administrador' },
                    { value: 'EDITOR', label: 'cadastros.editor' }
                ]
            }
        ]
    },
    categorias: {
        titulo: 'cadastros.titulo_categorias',
        descricao: 'cadastros.desc_categorias',
        icone: 'category',
        iconeClasse: 'info',
        listar: () => categoriasApi.listarCategorias(),
        criar: (valores) => categoriasApi.criarCategoria(valores['cad-nome-categoria']),
        formatarItem: (item: Categoria) => item.nome,
        campos: [
            { id: 'cad-nome-categoria', label: 'cadastros.campo_nome_categoria', type: 'text', placeholder: 'cadastros.placeholder_nome_categoria' }
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
        : (campo.options ?? []).map((op) =>
            typeof op === 'object' ? { ...op, label: t(op.label) } : op
          );

    return opcoesBrutas.map((op) => (typeof op === 'object' ? op : { value: op, label: op }));
}

export function formatarItem(tipo: string | null, item: unknown): string {
    const config = getConfig(tipo);
    return config ? config.formatarItem(item) : '';
}

export async function gerarCartaoRfid(usuarioId: number): Promise<{ token: string }> {
    try {
        return await usuariosApi.gerarTokenRfid(usuarioId);
    } catch (erro) {
        throw new Error(erro instanceof ApiError ? erro.message : 'Erro ao gerar token do cartão.');
    }
}

export async function revogarCartaoRfid(usuarioId: number): Promise<void> {
    try {
        await usuariosApi.revogarTokenRfid(usuarioId);
    } catch (erro) {
        throw new Error(erro instanceof ApiError ? erro.message : 'Erro ao revogar cartão.');
    }
}