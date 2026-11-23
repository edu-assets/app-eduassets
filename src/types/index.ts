/* ===== Enums ===== */

export type NivelAcesso = 'ADMINISTRADOR' | 'EDITOR';
export type StatusEmprestimo = 'AGENDADO' | 'ABERTO' | 'DEVOLVIDO';
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
    /** Início da janela enquanto AGENDADO; depois de confirmada a retirada, é o horário real da retirada. */
    dataRetirada: string;
    /** Início agendado (preenchido em empréstimos que nasceram como agendamento). */
    dataAgendada?: string | null;
    /** Fim previsto da janela de uso (obrigatório em agendamentos). */
    dataPrevistaDevolucao?: string | null;
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
    /** Só na resposta de criação: agendamentos que ficaram sem unidades por causa desta ocorrência. */
    agendamentosAfetados?: AgendamentoAfetado[];
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
    /** ISO com fuso. Obrigatória quando `dataRetirada` está no futuro (agendamento). */
    dataPrevistaDevolucao?: string;
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

export type StatusLoanUI = 'aberto' | 'devolvido' | 'agendado';

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
    /** Início agendado (ISO) ou null. Com status 'agendado', `data` é o mesmo instante. */
    dataAgendada: string | null;
    /** Fim previsto da janela (ISO) ou null. */
    dataPrevistaDevolucao: string | null;
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
    dataPrevistaDevolucaoISO?: string;
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


/** Agendamento afetado por uma ocorrência (campo `agendamentosAfetados` de cada ocorrência criada em POST /ocorrencias). */
export interface AgendamentoAfetado {
    id: number;
    solicitanteNome: string;
    dataAgendada: string;
    dataPrevistaDevolucao: string;
}

/** Corpo (`ApiError.payload`) do 400 de estoque insuficiente em POST /emprestimos. */
export interface PayloadEstoqueInsuficiente {
    itens: ItemEstoqueInsuficiente[];
    /** true quando a quantidade cabe na capacidade total (só falta janela livre): dá para agendar. */
    agendavel?: boolean;
    /** Sugestão (ISO) do próximo horário em que tudo estará livre; null se não houver. */
    proximoHorarioLivre?: string | null;
}

/** Empréstimo pendente que impede confirmar a retirada (payload do 409 `unidades_nao_devolvidas`). */
export interface EmprestimoPendenteDevolucao {
    id: number;
    solicitanteNome: string;
    dataPrevistaDevolucao: string | null;
}
