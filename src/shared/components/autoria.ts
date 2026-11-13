import { html, raw } from '../../core/utils/html.js';
import { t, formatarDataHora } from '../../core/state/i18nStore.js';
import type { Autor } from '../../types/index.js';
import type { CampoAutor, ComAutoria } from '../../core/utils/autoria.js';
export { extrairAutoria } from '../../core/utils/autoria.js';

export function temAutoria(obj: object, campo: CampoAutor): boolean {
    return (obj as Record<string, unknown>)[campo] !== undefined;
}

export function formatarDataAutoria(iso: string | null | undefined): string {
    if (!iso || Number.isNaN(new Date(iso).getTime())) return '';
    return formatarDataHora(iso);
}

/** Linha "Rótulo: Nome" (ou "—" para autor nulo). Nome escapado pelo helper `html`. */
export function renderAutoriaLinha(chaveRotulo: string, autor: Autor | null | undefined, dataIso?: string | null): string {
    const data = formatarDataAutoria(dataIso);
    const dataHtml = data ? html` <span class="autoria-data">· ${data}</span>` : '';
    return html`<span class="autoria-linha"><span class="autoria-rotulo">${t(chaveRotulo)}</span> <span class="autoria-nome">${autor?.nome ?? '—'}</span>${raw(dataHtml)}</span>`;
}

/** Linhas de autoria na ordem dada; ignora campos ausentes; `atualizadoPor` só aparece quando não nulo (registro já editado). */
export function renderAutoriaBloco(
    obj: ComAutoria,
    linhas: LinhaAutoria[]
): string {
    return linhas
        .filter(({ campo }) => temAutoria(obj, campo) && !(campo === 'atualizadoPor' && obj.atualizadoPor == null))
        .map(({ campo, chave, comData }) => renderAutoriaLinha(chave, obj[campo], comData ? obj.atualizadoEm : null))
        .join('');
}

type LinhaAutoria = { campo: CampoAutor; chave: string; comData?: boolean };

export function renderAutoriaEmprestimo(loan: ComAutoria & { status: string }): string {
    const linhas: LinhaAutoria[] = [
        { campo: 'criadoPor', chave: 'autoria.registrado_por' },
        { campo: 'atualizadoPor', chave: 'autoria.editado_por', comData: true }
    ];
    if (loan.status === 'devolvido') linhas.push({ campo: 'devolvidoPor', chave: 'autoria.devolvido_por' });
    return renderAutoriaBloco(loan, linhas);
}

export function renderAutoriaOcorrencia(oc: ComAutoria & { status: string }): string {
    const linhas: LinhaAutoria[] = [
        { campo: 'criadoPor', chave: 'autoria.criada_por' },
        { campo: 'atualizadoPor', chave: 'autoria.editado_por', comData: true }
    ];
    if (oc.status === 'resolvidos') linhas.push({ campo: 'resolvidoPor', chave: 'autoria.resolvida_por' });
    return renderAutoriaBloco(oc, linhas);
}

export function renderAutoriaEquipamento(eq: ComAutoria): string {
    return renderAutoriaBloco(eq, [
        { campo: 'criadoPor', chave: 'autoria.cadastrado_por' },
        { campo: 'atualizadoPor', chave: 'autoria.atualizado_por' }
    ]);
}

/** Envolve as linhas num contêiner (vazio quando não há autoria, ex.: convidado). */
export function envolverAutoria(linhas: string, classe = 'autoria-bloco'): string {
    return linhas ? html`<div class="${classe}">${raw(linhas)}</div>` : '';
}

/** Apenas a linha do criador (card/lista compactos). */
export function renderAutoriaCriador(obj: ComAutoria, chave: string): string {
    return renderAutoriaBloco(obj, [{ campo: 'criadoPor', chave }]);
}
