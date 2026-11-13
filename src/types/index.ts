/* ===== Enums ===== */

export type NivelAcesso = 'ADMINISTRADOR' | 'EDITOR';
export type StatusEmprestimo = 'ABERTO' | 'DEVOLVIDO';
export type TipoOcorrencia = 'OBSERVACAO' | 'MANUTENCAO' | 'QUEBRADO';
export type StatusOcorrencia = 'ABERTO' | 'RESOLVIDO';

/* ===== Entidades ===== */

/** Autor de um registro. Só vem da API para usuários autenticados; `null` quando o usuário foi removido. */
export interface Autor {
    id: number;
    nome: string;
}

/** Campos de autoria opcionais: ausentes nos dados de convidado. */
export interface AutoriaCampos {
    criadoPor?: Autor | null;
    atualizadoPor?: Autor | null;
}

export interface Categoria {
    id: number;
    nome: string;
    criadoPor?: Autor | null;
}

export interface Equipamento extends AutoriaCampos {
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
    ativo?: boolean;
    criadoPor?: Autor | null;
    atualizadoPor?: Autor | null;
}

export interface Usuario {
    id: number;
    nome: string;
    login: string;
    nivelAcesso: NivelAcesso;
    createdAt: string;
    possuiCartaoRfid: boolean;
    /** Absent on older API versions: treat as active. */
    ativo?: boolean;
    criadoPor?: Autor | null;
    atualizadoPor?: Autor | null;
}

export interface UsuarioUpdatePayload {
    nome?: string;
    login?: string;
    nivelAcesso?: NivelAcesso;
    ativo?: boolean;
}

export interface ItemEmprestimo {
    id: number;
    emprestimoId: number;
    equipamentoId: number;
    quantidade: number;
    equipamento?: Equipamento;
}

export interface Emprestimo extends AutoriaCampos {
    devolvidoPor?: Autor | null;
    atualizadoEm?: string | null;
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

export interface Ocorrencia extends AutoriaCampos {
    resolvidoPor?: Autor | null;
    atualizadoEm?: string | null;
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
    /** ISO timestamp of the last password change; absent or null when never recorded. */
    senhaAlteradaEm?: string | null;
}

export interface LoginResponse {
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

export interface ResponsavelUpdatePayload {
    nome?: string;
    cargo?: string;
    ativo?: boolean;
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
    dataRetirada?: string;
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

/* UI formats */

export type LoanItemUI = {
    id: string | number;
    nome: string;
    quantidade: number;
};

export type StatusLoanUI = 'aberto' | 'devolvido';

export interface LoanUI extends AutoriaCampos {
    devolvidoPor?: Autor | null;
    atualizadoEm?: string | null;
    id: number;
    numero: number;
    aluno: string;
    responsavel: string;
    responsavelId: number;
    status: StatusLoanUI;
    data: string;
    dataDevolucao: string | null;
    observacao: string;
    createdAt: Date;
    itens: LoanItemUI[];
}

// loan draft is a temporary representation of a loan that is being created or edited, before it is finalized and sent to the backend.
export interface LoanDraft {
    aluno: string;
    responsavelId: string | number;
    dataRetiradaISO?: string;
    observacao?: string;
    itens: LoanItemUI[];
}

export interface LoanUpdate {
    itens?: LoanItemUI[];
}

export type StatusOcorrenciaUI = 'aberto' | 'resolvidos';

export interface OcorrenciaUI extends AutoriaCampos {
    resolvidoPor?: Autor | null;
    atualizadoEm?: string | null;
    id: number;
    equipamentoId: number;
    tipo: string;
    status: StatusOcorrenciaUI;
    categoria: string;
    modelo: string;
    numero: string;
    problema: string;
    descricao: string;
    registradoEm: string;
    resolvidoEm: string;
    medidas: string;
}

export interface AuthState {
    autenticado: boolean;
    usuario: AuthUser | null;
}

export interface CategoriaResumoDados {
    id: number;
    modelo: string;
    categoria: string;
    total: number;
    disponivel: number;
    emprestado: number;
    manutencao: number;
    quebrado: number;
}

export interface ResumoDashboard {
    total: number;
    disponivel: number;
    emprestado: number;
    manutencao: number;
    quebrado: number;
}

export interface ControleRegistroDados {
    categoria: string;
    modelo: string;
    numero: string;
    problema: string;
    descricao: string;
    medidas?: string;
}

export type FormatoExportacao = 'csv' | 'excel' | 'pdf';
export type TipoDadosExportacao = 'equipamentos' | 'devolucoes';

export interface FiltrosExportacao {
    tipoDados: string;
    dataInicial: string;
    dataFinal: string;
    formato: string;
    equipamentoIds: string[];
    observacao: string;
}

export interface ControleRegistroDados {
    categoria: string;
    modelo: string;
    equipamentoId?: string | number;
    numero: string;
    problema: string;
    descricao: string;
    medidas?: string;
}

export interface ItemEstoqueInsuficiente {
    equipamentoId: number;
    nome: string;
    categoria: string;
    solicitado: number;
    disponivel: number;
}
