/* ===== Enums ===== */

export type NivelAcesso = 'ADMINISTRADOR' | 'EDITOR';
export type StatusEmprestimo = 'ABERTO' | 'DEVOLVIDO';
export type TipoOcorrencia = 'OBSERVACAO' | 'MANUTENCAO' | 'QUEBRADO';
export type StatusOcorrencia = 'ABERTO' | 'RESOLVIDO';

/* ===== Entidades ===== */

export interface Categoria {
    id: number;
    nome: string;
}

export interface Equipamento {
    id: number;
    categoriaId: number;
    modelo: string;
    quantidadeTotal: number;
    quantidadeDisponivel: number;
    quantidadeQuebrada: number;
    createdAt: string;
    updatedAt: string;
    categoria?: Categoria;
}

export interface Responsavel {
    id: number;
    nome: string;
    cargo: string;
}

export interface Usuario {
    id: number;
    nome: string;
    login: string;
    nivelAcesso: NivelAcesso;
    createdAt: string;
}

export interface ItemEmprestimo {
    id: number;
    emprestimoId: number;
    equipamentoId: number;
    quantidade: number;
    equipamento?: Equipamento;
}

export interface Emprestimo {
    id: number;
    solicitanteNome: string;
    responsavelId: number;
    status: StatusEmprestimo;
    dataRetirada: string;
    dataDevolucao: string | null;
    observacao: string | null;
    createdAt: string;
    responsavel?: Responsavel;
    itens: ItemEmprestimo[];
}

export interface Ocorrencia {
    id: number;
    equipamentoId: number;
    numero: string | null;
    tipo: TipoOcorrencia;
    status: StatusOcorrencia;
    problema: string;
    descricao: string;
    resolvidoEm: string | null;
    medidasTomadas: string | null;
    createdAt: string;
    equipamento?: Equipamento;
}

export interface AuthUser {
    id: number;
    nome: string;
    login: string;
    nivelAcesso: NivelAcesso;
}

export interface LoginResponse {
    token: string;
    user: AuthUser;
}

/* ===== Payloads = */

export interface EquipamentoCreatePayload {
    categoriaId: number;
    modelo: string;
    quantidadeTotal: number;
}

export interface EquipamentoUpdatePayload {
    quantidadeTotal?: number;
    quantidadeDisponivel?: number;
    quantidadeQuebrada?: number;
}

export interface ResponsavelCreatePayload {
    nome: string;
    cargo: string;
}

export interface UsuarioCreatePayload {
    nome: string;
    login: string;
    senha: string;
    nivelAcesso: NivelAcesso;
}

export interface ItemEmprestimoPayload {
    equipamentoId: number;
    quantidade: number;
}

export interface EmprestimoCreatePayload {
    solicitanteNome: string;
    responsavelId: number;
    dataRetirada: string;
    observacao?: string;
    itens: ItemEmprestimoPayload[];
}

export interface OcorrenciaCreatePayload {
    equipamentoId: number;
    tipo: TipoOcorrencia;
    problema: string;
    descricao: string;
    numeros: string[];
}

export interface OcorrenciaUpdatePayload {
    problema?: string;
    descricao?: string;
    numero?: string;
    medidasTomadas?: string;
}