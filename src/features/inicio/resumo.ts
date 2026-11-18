import { getEquipamentos, subscribe as subscribeEquipamentos } from '../../core/state/equipamentoStore.js';
import { getLoansAbertos, subscribe as subscribeEmprestimos } from '../../core/state/loanStore.js';
import { getOcorrencias, subscribe as subscribeOcorrencias } from '../../core/state/ocorrenciasStore.js';
import { getLoadStatus, subscribeLoadStatus, type ChaveCarga } from '../../core/state/loadStatus.js';
import { getLocale, subscribe as subscribeI18n, t } from '../../core/state/i18nStore.js';
import { statusEstoqueEquipamento } from '../dashboard/templates.js';
import type { Equipamento, LoanUI, OcorrenciaUI } from '../../types/index.js';

/**
 * Resumo "Operações agora" do Início: quatro indicadores calculados no cliente a partir dos stores que o app
 * já mantém carregados e sincronizados (nenhuma consulta nova à API/banco). Os números seguem as mesmas
 * regras do Dashboard (estoque esgotado/baixo, itens emprestados).
 */

export type EstadoIndicador = 'neutro' | 'info' | 'ok' | 'alerta' | 'erro';

export interface ResumoOperacoes {
    abertos: { total: number; maisAntigo: Date | null };
    estoque: { disponivel: number; total: number; emprestado: number };
    ocorrencias: { abertas: number; manutencao: number; quebrado: number; observacao: number };
    alertas: { esgotados: Equipamento[]; baixos: Equipamento[] };
}

export function calcularResumoOperacoes(
    equipamentos: Equipamento[],
    loansAbertos: LoanUI[],
    ocorrencias: OcorrenciaUI[]
): ResumoOperacoes {
    let maisAntigo: Date | null = null;
    let emprestado = 0;
    loansAbertos.forEach((loan) => {
        const criado = loan.createdAt instanceof Date ? loan.createdAt : new Date(loan.createdAt);
        if (!Number.isNaN(criado.getTime()) && (!maisAntigo || criado < maisAntigo)) maisAntigo = criado;
        loan.itens.forEach((item) => { emprestado += Number(item.quantidade) || 0; });
    });

    const abertas = ocorrencias.filter((o) => o.status === 'aberto');
    const contarTipo = (tipo: string): number => abertas.filter((o) => o.tipo === tipo).length;

    const esgotados: Equipamento[] = [];
    const baixos: Equipamento[] = [];
    let disponivel = 0;
    let total = 0;
    equipamentos.forEach((eq) => {
        disponivel += Number(eq.quantidadeDisponivel) || 0;
        total += Number(eq.quantidadeTotal) || 0;
        const status = statusEstoqueEquipamento(eq);
        if (status === 'esgotado') esgotados.push(eq);
        else if (status === 'estoque-baixo') baixos.push(eq);
    });

    return {
        abertos: { total: loansAbertos.length, maisAntigo },
        estoque: { disponivel, total, emprestado },
        ocorrencias: {
            abertas: abertas.length,
            manutencao: contarTipo('manutencao'),
            quebrado: contarTipo('quebrado'),
            observacao: contarTipo('observacao')
        },
        alertas: { esgotados, baixos }
    };
}

export interface IndicadorTexto {
    numero: string;
    unidade: string;
    detalhe: string;
    estado: EstadoIndicador;
}

const plural = (n: number, singular: string, pluralKey: string): string => t(n === 1 ? singular : pluralKey);
const comN = (chave: string, n: number): string => t(chave).replace('{n}', String(n));

function formatarHoraCurta(data: Date): string {
    return data.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
}

/** Textos de cada indicador no idioma atual (separado do DOM para teste). */
export function textosIndicadores(r: ResumoOperacoes): Record<'abertos' | 'disponiveis' | 'ocorrencias' | 'estoque', IndicadorTexto> {
    const { abertos, estoque, ocorrencias, alertas } = r;

    const partesOcorrencias = [
        ocorrencias.manutencao ? comN('inicio.resumo_n_manutencao', ocorrencias.manutencao) : '',
        ocorrencias.quebrado ? comN(ocorrencias.quebrado === 1 ? 'inicio.resumo_n_quebrado' : 'inicio.resumo_n_quebrados', ocorrencias.quebrado) : '',
        ocorrencias.observacao ? comN(ocorrencias.observacao === 1 ? 'inicio.resumo_n_observacao' : 'inicio.resumo_n_observacoes', ocorrencias.observacao) : ''
    ].filter(Boolean);

    const emAlerta = alertas.esgotados.length + alertas.baixos.length;
    const primeiroAlerta = alertas.esgotados[0]
        ? t('inicio.resumo_modelo_esgotado').replace('{modelo}', alertas.esgotados[0].modelo)
        : alertas.baixos[0] ? t('inicio.resumo_modelo_baixo').replace('{modelo}', alertas.baixos[0].modelo) : '';
    const pctLivre = estoque.total > 0 ? Math.round((estoque.disponivel / estoque.total) * 100) : 0;

    return {
        abertos: {
            numero: String(abertos.total),
            unidade: plural(abertos.total, 'inicio.resumo_emprestimo', 'inicio.resumo_emprestimos'),
            detalhe: abertos.total > 0 && abertos.maisAntigo
                ? t('inicio.resumo_mais_antigo').replace('{hora}', formatarHoraCurta(abertos.maisAntigo))
                : t('inicio.resumo_nenhum_aberto'),
            estado: abertos.total > 0 ? 'neutro' : 'ok'
        },
        disponiveis: {
            numero: String(estoque.disponivel),
            unidade: t('inicio.resumo_de_total').replace('{total}', String(estoque.total)),
            detalhe: estoque.total > 0
                ? t('inicio.resumo_emprestados_livre').replace('{n}', String(estoque.emprestado)).replace('{pct}', String(pctLivre))
                : t('inicio.resumo_sem_equipamentos'),
            estado: 'info'
        },
        ocorrencias: {
            numero: String(ocorrencias.abertas),
            unidade: plural(ocorrencias.abertas, 'inicio.resumo_aberta', 'inicio.resumo_abertas'),
            detalhe: partesOcorrencias.length ? partesOcorrencias.join(' · ') : t('inicio.resumo_nenhuma_ocorrencia'),
            estado: ocorrencias.abertas > 0 ? 'alerta' : 'ok'
        },
        estoque: {
            numero: String(emAlerta),
            unidade: t('inicio.resumo_em_alerta'),
            detalhe: emAlerta > 1 ? `${primeiroAlerta} · +${emAlerta - 1}` : primeiroAlerta || t('inicio.resumo_tudo_certo'),
            estado: alertas.esgotados.length ? 'erro' : alertas.baixos.length ? 'alerta' : 'ok'
        }
    };
}

/** De quais cargas cada indicador depende (para esqueleto/erro). */
const DEPENDENCIAS: Record<keyof ReturnType<typeof textosIndicadores>, ChaveCarga[]> = {
    abertos: ['emprestimos'],
    disponiveis: ['equipamentos', 'emprestimos'],
    ocorrencias: ['ocorrencias'],
    estoque: ['equipamentos']
};

const BADGE_ESTOQUE: Record<EstadoIndicador, string> = {
    neutro: 'icon-badge--neutral', info: 'icon-badge--primary', ok: 'icon-badge--success',
    alerta: 'icon-badge--warning', erro: 'icon-badge--error'
};

function preencherCard(card: HTMLElement, texto: IndicadorTexto | null, falhou: boolean): void {
    const numero = card.querySelector<HTMLElement>('[data-resumo-numero]');
    const unidade = card.querySelector<HTMLElement>('[data-resumo-unidade]');
    const detalhe = card.querySelector<HTMLElement>('[data-resumo-detalhe]');
    const status = card.querySelector<HTMLElement>('.inicio-resumo-status');
    if (!numero || !unidade || !detalhe || !status) return;

    if (!texto) {
        numero.textContent = '—';
        unidade.textContent = '';
        detalhe.textContent = falhou ? t('inicio.resumo_indisponivel') : '';
        detalhe.removeAttribute('title');
        status.dataset.estado = 'neutro';
        card.classList.toggle('is-carregando', !falhou);
        return;
    }

    card.classList.remove('is-carregando');
    numero.textContent = texto.numero;
    unidade.textContent = texto.unidade;
    detalhe.textContent = texto.detalhe;
    // Texto longo é abreviado com reticências: o completo fica no title.
    detalhe.title = texto.detalhe;
    status.dataset.estado = texto.estado;

    if (card.dataset.resumo === 'estoque') {
        const badge = card.querySelector<HTMLElement>('.inicio-resumo-icone');
        if (badge) {
            Object.values(BADGE_ESTOQUE).forEach((classe) => badge.classList.remove(classe));
            badge.classList.add(BADGE_ESTOQUE[texto.estado]);
        }
    }
}

export function renderResumoOperacoes(raiz: ParentNode = document): void {
    const secao = raiz.querySelector<HTMLElement>('.inicio-resumo');
    if (!secao) return;

    const estadoCarga = (chave: ChaveCarga) => getLoadStatus(chave).status;
    const textos = textosIndicadores(calcularResumoOperacoes(getEquipamentos(), getLoansAbertos(), getOcorrencias()));

    let todosProntos = true;
    secao.querySelectorAll<HTMLElement>('.inicio-resumo-card[data-resumo]').forEach((card) => {
        const chave = card.dataset.resumo as keyof typeof DEPENDENCIAS;
        const deps = DEPENDENCIAS[chave];
        if (!deps) return;
        const estados = deps.map(estadoCarga);
        const pronto = estados.every((e) => e === 'pronto');
        if (!pronto) todosProntos = false;
        preencherCard(card, pronto ? textos[chave] : null, estados.includes('erro'));
    });

    if (todosProntos) secao.removeAttribute('aria-busy');
    else secao.setAttribute('aria-busy', 'true');

    const atualizado = raiz.querySelector<HTMLElement>('#inicio-resumo-atualizado');
    if (atualizado) {
        atualizado.hidden = !todosProntos;
        if (todosProntos) atualizado.textContent = t('inicio.resumo_atualizado').replace('{hora}', formatarHoraCurta(new Date()));
    }
}

let agendado = false;

/** Várias notificações na mesma rodada (stores + status de carga) viram uma só renderização. */
function agendarRender(): void {
    if (agendado) return;
    agendado = true;
    queueMicrotask(() => {
        agendado = false;
        renderResumoOperacoes();
    });
}

export function initResumoOperacoes(): void {
    if (!document.querySelector('.inicio-resumo')) return;
    subscribeEquipamentos(agendarRender);
    subscribeEmprestimos(agendarRender);
    subscribeOcorrencias(agendarRender);
    subscribeLoadStatus(agendarRender);
    subscribeI18n(agendarRender);
    renderResumoOperacoes();
}
