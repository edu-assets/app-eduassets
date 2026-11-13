import { http, ApiError, type OpcoesLeitura } from './apiClient.js';
import type { Emprestimo, EmprestimoCreatePayload, ItemEmprestimoPayload, StatusEmprestimo } from '../../types/index.js';

/**
 * Filtros de `GET /emprestimos`. `de`/`ate` aceitam AAAA-MM-DD (interpretado como dia LOCAL: é enviado como data e
 * hora ISO com o fuso do navegador) ou uma data e hora ISO já com fuso (enviada como está).
 * `q` só é enviado para usuários autenticados (a API recusa `q` de convidados com 400).
 */
export interface FiltrosEmprestimos {
    status?: StatusEmprestimo;
    de?: string;
    ate?: string;
    q?: string;
}

export interface PaginaEmprestimos {
    items: Emprestimo[];
    nextCursor: number | null;
    limit: number;
}

export interface ConsultaPaginaEmprestimos {
    filtros?: FiltrosEmprestimos;
    cursor?: number | null;
    limit?: number;
    /** Convidados não podem enviar `q`. */
    autenticado: boolean;
}

export const LIMITE_PAGINA_PADRAO = 50;
export const LIMITE_PAGINA_MAXIMO = 100;
export const TAMANHO_MAXIMO_BUSCA = 100;
/** Teto de páginas ao percorrer uma lista inteira (100 × 200 = 20 000 empréstimos). */
export const MAX_PAGINAS = 200;

/**
 * Compatibilidade com a API anterior à 1.5 (deploys independentes): ela valida a query com `.strict()` e recusa
 * `paginado`/`status`/`de`/`ate`/`q` com 400 ("Unrecognized key"). Ao detectar isso, as leituras seguintes usam só os
 * parâmetros antigos (limit/cursor) e os filtros são aplicados localmente. Vale até recarregar a página.
 */
let apiLegada = false;

/** Usado em testes. */
export function redefinirCompatibilidadeEmprestimos(): void {
    apiLegada = false;
}

function doisDigitos(valor: number): string {
    return String(valor).padStart(2, '0');
}

/**
 * Converte um dia local AAAA-MM-DD no início (00:00:00) ou fim (23:59:59.999) desse dia com o fuso do navegador,
 * ex.: 2026-11-14T00:00:00.000-03:00. Valores que não são AAAA-MM-DD são devolvidos como estão.
 */
export function limiteDiaLocal(valor: string, fimDoDia: boolean): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (!match) return valor;
    const [, ano, mes, dia] = match;
    const data = fimDoDia
        ? new Date(Number(ano), Number(mes) - 1, Number(dia), 23, 59, 59, 999)
        : new Date(Number(ano), Number(mes) - 1, Number(dia), 0, 0, 0, 0);
    const deslocamento = -data.getTimezoneOffset();
    const sinal = deslocamento >= 0 ? '+' : '-';
    const abs = Math.abs(deslocamento);
    const fuso = `${sinal}${doisDigitos(Math.floor(abs / 60))}:${doisDigitos(abs % 60)}`;
    return `${valor}T${fimDoDia ? '23:59:59.999' : '00:00:00.000'}${fuso}`;
}

/** Normaliza os filtros: remove vazios, apara e limita `q`. */
export function normalizarFiltros(filtros: FiltrosEmprestimos = {}): FiltrosEmprestimos {
    const resultado: FiltrosEmprestimos = {};
    if (filtros.status === 'ABERTO' || filtros.status === 'DEVOLVIDO') resultado.status = filtros.status;
    if (filtros.de?.trim()) resultado.de = filtros.de.trim();
    if (filtros.ate?.trim()) resultado.ate = filtros.ate.trim();
    const q = filtros.q?.trim().slice(0, TAMANHO_MAXIMO_BUSCA).trim();
    if (q) resultado.q = q;
    return resultado;
}

function parametrosFiltros(filtros: FiltrosEmprestimos, autenticado: boolean): Record<string, string> {
    const f = normalizarFiltros(filtros);
    const params: Record<string, string> = {};
    if (f.status) params.status = f.status;
    if (f.de) params.de = limiteDiaLocal(f.de, false);
    if (f.ate) params.ate = limiteDiaLocal(f.ate, true);
    if (autenticado && f.q) params.q = f.q;
    return params;
}

function caminho(params: Record<string, string | number | undefined>): string {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== '') query.set(chave, String(valor));
    });
    const texto = query.toString();
    return texto ? `/emprestimos?${texto}` : '/emprestimos';
}

/** 400 da API antiga por parâmetro desconhecido (zod `.strict()` → issue sem campo, "Unrecognized key"). */
function ehErroParametroDesconhecido(erro: unknown): boolean {
    if (!(erro instanceof ApiError) || erro.status !== 400) return false;
    return (erro.detalhesValidacao ?? []).some((detalhe) =>
        !String(detalhe.campo ?? '').trim() && /unrecogni[sz]ed|n[aã]o reconhecid/i.test(String(detalhe.mensagem ?? ''))
    );
}

type RespostaLista = Emprestimo[] | Partial<PaginaEmprestimos> | null | undefined;

/** Lê com os parâmetros novos; na API antiga repete só com os parâmetros legados. */
async function lerComCompatibilidade(
    novos: Record<string, string | number | undefined>,
    legados: Record<string, string | number | undefined>,
    opcoes?: OpcoesLeitura
): Promise<{ resposta: RespostaLista; legado: boolean }> {
    if (!apiLegada) {
        try {
            return { resposta: await http.get<RespostaLista>(caminho(novos), opcoes), legado: false };
        } catch (erro) {
            if (!ehErroParametroDesconhecido(erro)) throw erro;
            apiLegada = true;
        }
    }
    return { resposta: await http.get<RespostaLista>(caminho(legados), opcoes), legado: true };
}

function cursorValido(valor: unknown): number | null {
    const numero = typeof valor === 'string' ? Number(valor) : valor;
    return typeof numero === 'number' && Number.isInteger(numero) && numero > 0 ? numero : null;
}

/** Ordem do histórico (igual à da API paginada): retirada mais recente primeiro, id desempata. */
export function ordenarHistorico(emprestimos: Emprestimo[]): Emprestimo[] {
    return [...emprestimos].sort((a, b) => {
        const diferenca = new Date(b.dataRetirada).getTime() - new Date(a.dataRetirada).getTime();
        return diferenca || b.id - a.id;
    });
}

/** Filtros aplicados no cliente quando a API não os entende (API antiga). */
export function filtrarLocalmente(emprestimos: Emprestimo[], filtros: FiltrosEmprestimos, autenticado: boolean): Emprestimo[] {
    const f = normalizarFiltros(filtros);
    const inicio = f.de ? new Date(limiteDiaLocal(f.de, false)).getTime() : null;
    const fim = f.ate ? new Date(limiteDiaLocal(f.ate, true)).getTime() : null;
    const termo = autenticado && f.q ? f.q.toLowerCase() : '';
    return emprestimos.filter((emprestimo) => {
        if (f.status && emprestimo.status !== f.status) return false;
        const retirada = new Date(emprestimo.dataRetirada).getTime();
        if (inicio !== null && retirada < inicio) return false;
        if (fim !== null && retirada > fim) return false;
        if (termo) {
            const textos = [
                emprestimo.solicitanteNome,
                emprestimo.responsavel?.nome,
                ...(emprestimo.itens ?? []).map((item) => item.equipamento?.modelo)
            ];
            if (!textos.some((texto) => (texto ?? '').toLowerCase().includes(termo))) return false;
        }
        return true;
    });
}

/**
 * Uma página do histórico (`paginado=1`), na ordem dataRetirada desc, id desc.
 * Compatível com a API antiga: um array (autenticado sem paginação) vira uma página única (nextCursor null).
 */
export async function listarPaginaEmprestimos(consulta: ConsultaPaginaEmprestimos, opcoes?: OpcoesLeitura): Promise<PaginaEmprestimos> {
    const limit = Math.min(LIMITE_PAGINA_MAXIMO, Math.max(1, Math.floor(consulta.limit ?? LIMITE_PAGINA_PADRAO)));
    const cursor = cursorValido(consulta.cursor) ?? undefined;
    const filtros = consulta.filtros ?? {};
    const { resposta, legado } = await lerComCompatibilidade(
        { paginado: 1, limit, cursor, ...parametrosFiltros(filtros, consulta.autenticado) },
        consulta.autenticado ? {} : { limit, cursor },
        opcoes
    );

    let pagina: PaginaEmprestimos;
    if (Array.isArray(resposta)) {
        pagina = { items: ordenarHistorico(resposta), nextCursor: null, limit };
    } else {
        pagina = {
            items: Array.isArray(resposta?.items) ? resposta.items : [],
            nextCursor: cursorValido(resposta?.nextCursor),
            limit
        };
    }
    if (legado) pagina.items = filtrarLocalmente(pagina.items, filtros, consulta.autenticado);
    return pagina;
}

export interface ResultadoTodasPaginas {
    items: Emprestimo[];
    /** false quando o teto de páginas foi atingido antes do fim da lista. */
    completo: boolean;
}

/** Percorre todas as páginas (`limit` 100 por padrão) até `nextCursor` null, com teto de páginas. */
export async function listarTodasPaginasEmprestimos(
    consulta: Omit<ConsultaPaginaEmprestimos, 'cursor'>,
    opcoes?: OpcoesLeitura,
    maxPaginas = MAX_PAGINAS
): Promise<ResultadoTodasPaginas> {
    const items: Emprestimo[] = [];
    const vistos = new Set<number>();
    const cursoresUsados = new Set<number>();
    let cursor: number | null = null;
    for (let pagina = 0; pagina < maxPaginas; pagina++) {
        const resultado = await listarPaginaEmprestimos({ limit: LIMITE_PAGINA_MAXIMO, ...consulta, cursor }, opcoes);
        resultado.items.forEach((item) => {
            if (vistos.has(item.id)) return;
            vistos.add(item.id);
            items.push(item);
        });
        // Fim da lista, ou cursor repetido (servidor sem paginação real): para.
        if (resultado.nextCursor === null || cursoresUsados.has(resultado.nextCursor)) return { items, completo: true };
        cursoresUsados.add(resultado.nextCursor);
        cursor = resultado.nextCursor;
    }
    return { items, completo: false };
}

/**
 * Todos os empréstimos ABERTOS (Devoluções, estoque emprestado). Autenticado: `status=ABERTO` sem paginação (array
 * completo). Convidado: percorre as páginas de `status=ABERTO`. O filtro de status também é aplicado localmente
 * (a API antiga devolve todos os empréstimos).
 */
export async function listarEmprestimosAbertos(autenticado: boolean, opcoes?: OpcoesLeitura): Promise<Emprestimo[]> {
    if (autenticado) {
        const { resposta } = await lerComCompatibilidade({ status: 'ABERTO' }, {}, opcoes);
        if (Array.isArray(resposta)) return resposta.filter((emprestimo) => emprestimo.status === 'ABERTO');
        // Resposta paginada inesperada: percorre as páginas.
    }
    const { items, completo } = await listarTodasPaginasEmprestimos({ autenticado, filtros: { status: 'ABERTO' } }, opcoes);
    if (!completo) console.warn('[eduAssets] Lista de empréstimos abertos truncada no limite de páginas.');
    return items.filter((emprestimo) => emprestimo.status === 'ABERTO');
}

export function criarEmprestimo(dados: EmprestimoCreatePayload): Promise<Emprestimo> {
    return http.post<Emprestimo>('/emprestimos', dados);
}

export function atualizarItensEmprestimo(id: number, itens: ItemEmprestimoPayload[]): Promise<Emprestimo> {
    return http.patch<Emprestimo>(`/emprestimos/${id}`, { itens });
}

/** Sem `dataDevolucao` o servidor usa o próprio horário. */
export function devolverEmprestimo(id: number, dataDevolucao?: string): Promise<Emprestimo> {
    return http.patch<Emprestimo>(`/emprestimos/${id}/devolver`, dataDevolucao ? { dataDevolucao } : {});
}
