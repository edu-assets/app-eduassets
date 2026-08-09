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

/* UI formats */

export type LoanItemUI = {
    id: string | number;
    nome: string;
    quantidade: number;
};

export type StatusLoanUI = 'aberto' | 'devolvido';

export interface LoanUI {
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
    dataRetiradaISO: string;
    observacao?: string;
    itens: LoanItemUI[];
}

export interface LoanUpdate {
    itens?: LoanItemUI[];
}

export type StatusOcorrenciaUI = 'aberto' | 'resolvidos';

export interface OcorrenciaUI {
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
    disponivelPct: string;
    emprestadoPct: string;
    manutencaoPct: string;
    quebradoPct: string;
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