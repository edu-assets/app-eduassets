import { html, raw } from '../../core/utils/html.js';
import { t } from '../../core/state/i18nStore.js';
import type { FiltrosHistorico } from '../../core/state/loanStore.js';

export type PeriodoHistorico = 'hoje' | '7dias' | 'mes' | 'tudo';
export type StatusFiltroHistorico = 'TODOS' | 'ABERTO' | 'DEVOLVIDO';

const STATUS_CHIPS: Array<{ valor: StatusFiltroHistorico; chave: string }> = [
    { valor: 'TODOS', chave: 'dashboard.filtro_todos' },
    { valor: 'ABERTO', chave: 'dashboard.filtro_abertos' },
    { valor: 'DEVOLVIDO', chave: 'dashboard.filtro_devolvidos' }
];

const PERIODO_CHIPS: Array<{ valor: PeriodoHistorico; chave: string }> = [
    { valor: 'hoje', chave: 'dashboard.filtro_hoje' },
    { valor: '7dias', chave: 'dashboard.filtro_7_dias' },
    { valor: 'mes', chave: 'dashboard.filtro_este_mes' },
    { valor: 'tudo', chave: 'dashboard.filtro_tudo' }
];

/** YYYY-MM-DD no fuso local (não UTC). */
export function formatarDataLocal(data: Date): string {
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    const dd = String(data.getDate()).padStart(2, '0');
    return `${data.getFullYear()}-${mm}-${dd}`;
}

/** de/ate (locais) de um chip de período; "tudo" remove o intervalo. */
export function intervaloDoPeriodo(periodo: PeriodoHistorico, hoje: Date = new Date()): Pick<FiltrosHistorico, 'de' | 'ate'> {
    if (periodo === 'tudo') return { de: undefined, ate: undefined };
    const ate = formatarDataLocal(hoje);
    if (periodo === 'hoje') return { de: ate, ate };
    if (periodo === '7dias') {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6);
        return { de: formatarDataLocal(inicio), ate };
    }
    return { de: formatarDataLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), ate };
}

/** Chip de período correspondente aos filtros atuais; null quando o intervalo não é um dos atalhos. */
export function periodoAtivo(filtros: FiltrosHistorico, hoje: Date = new Date()): PeriodoHistorico | null {
    if (!filtros.de && !filtros.ate) return 'tudo';
    const candidatos: PeriodoHistorico[] = ['hoje', '7dias', 'mes'];
    return candidatos.find((p) => {
        const { de, ate } = intervaloDoPeriodo(p, hoje);
        return de === filtros.de && ate === filtros.ate;
    }) ?? null;
}

export function haFiltrosAtivos(filtros: FiltrosHistorico): boolean {
    return Boolean(filtros.status || filtros.de || filtros.ate || (filtros.q ?? '').trim());
}

function chip(grupo: 'status' | 'periodo', valor: string, rotulo: string, ativo: boolean): string {
    return html`<button type="button" class="historico-filtro-chip${raw(ativo ? ' active' : '')}" data-filtro-grupo="${grupo}" data-filtro-valor="${valor}" aria-pressed="${ativo ? 'true' : 'false'}">${rotulo}</button>`;
}

export function renderFiltrosHistorico(filtros: FiltrosHistorico, hoje: Date = new Date()): string {
    const statusAtual: StatusFiltroHistorico = filtros.status ?? 'TODOS';
    const periodo = periodoAtivo(filtros, hoje);
    const statusHtml = STATUS_CHIPS.map((c) => chip('status', c.valor, t(c.chave), c.valor === statusAtual)).join('');
    const periodoHtml = PERIODO_CHIPS.map((c) => chip('periodo', c.valor, t(c.chave), c.valor === periodo)).join('');
    const limpar = haFiltrosAtivos(filtros)
        ? html`<button type="button" class="btn btn-neutral btn-sm historico-filtros-limpar" data-filtro-limpar>${t('shell.limpar_filtros')}</button>`
        : '';
    return html`
        <div class="historico-filtro-grupo" role="group" aria-label="${t('shell.status')}">
            <span class="historico-filtro-rotulo">${t('shell.status')}</span>${raw(statusHtml)}
        </div>
        <div class="historico-filtro-grupo" role="group" aria-label="${t('shell.periodo')}">
            <span class="historico-filtro-rotulo">${t('shell.periodo')}</span>${raw(periodoHtml)}
        </div>
        ${raw(limpar)}
    `;
}

/** Redesenha a barra de filtros preservando o foco (o botão pressionado é recriado). */
export function renderBarraFiltros(container: HTMLElement, filtros: FiltrosHistorico): void {
    const ativo = document.activeElement;
    const foco = ativo instanceof HTMLElement && container.contains(ativo)
        ? { grupo: ativo.dataset.filtroGrupo, valor: ativo.dataset.filtroValor, limpar: ativo.hasAttribute('data-filtro-limpar') }
        : null;
    container.innerHTML = renderFiltrosHistorico(filtros);
    if (!foco) return;
    const alvo = foco.limpar
        ? container.querySelector<HTMLElement>('[data-filtro-limpar]')
        : [...container.querySelectorAll<HTMLElement>('[data-filtro-grupo]')]
            .find((el) => el.dataset.filtroGrupo === foco.grupo && el.dataset.filtroValor === foco.valor);
    alvo?.focus();
}

/** Cria (uma vez) o contêiner da barra de filtros no topo da aba Histórico. */
export function garantirBarraFiltros(): HTMLElement | null {
    const existente = document.getElementById('historico-filtros');
    if (existente) return existente;
    const aba = document.getElementById('tab-historico');
    if (!aba) return null;
    const barra = document.createElement('div');
    barra.id = 'historico-filtros';
    barra.className = 'historico-filtros';
    barra.setAttribute('role', 'region');
    barra.setAttribute('aria-label', t('dashboard.filtros_historico'));
    aba.insertBefore(barra, aba.firstChild);
    return barra;
}
