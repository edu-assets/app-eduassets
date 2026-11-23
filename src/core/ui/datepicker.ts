import type Flatpickr from 'flatpickr';
import { getIdioma } from '../state/i18nStore.js';
import { agora } from '../time/serverClock.js';

export type FlatpickrInstance = Flatpickr.Instance;

type Idioma = 'pt' | 'en';

interface FlatpickrModulo {
    flatpickr: typeof Flatpickr;
    locale: Flatpickr.CustomLocale | undefined; 
}

const modulePromises: Partial<Record<Idioma, Promise<FlatpickrModulo>>> = {};

const DATE_FORMATS: Record<Idioma, string> = {
    pt: 'd/m/Y à\\s H:i',
    en: 'm/d/Y \\a\\t h:i K'
};

function carregarFlatpickr(idioma: Idioma): Promise<FlatpickrModulo> {
    if (!modulePromises[idioma]) {
        modulePromises[idioma] = (async () => {
            const [flatpickrMod] = await Promise.all([
                import('flatpickr'),
                import('flatpickr/dist/flatpickr.min.css')
            ]);

            if (idioma === 'pt') {
                const l10nMod = await import('flatpickr/dist/l10n/pt.js');
                return { flatpickr: flatpickrMod.default, locale: l10nMod.Portuguese };
            }

            return { flatpickr: flatpickrMod.default, locale: undefined };
        })();
    }
    return modulePromises[idioma]!;
}

export interface OpcoesDataAutoPicker {
    /** Limite superior calculado a cada abertura (ex.: agora + 15 dias); o relógio segue andando com a página aberta. */
    maxDate?: () => Date;
    /** Depois de qualquer mudança feita pelo usuário (o campo deixa de ser automático). */
    aoMudar?: (data: Date | null) => void;
}

export async function criarDataAutoPicker(input: HTMLElement, opcoes: OpcoesDataAutoPicker = {}): Promise<FlatpickrInstance> {
    const idioma = getIdioma() as Idioma;
    const { flatpickr, locale } = await carregarFlatpickr(idioma);

    input.setAttribute('step', '60');

    const instance = flatpickr(input, {
        enableTime: true,
        time_24hr: idioma === 'pt',
        dateFormat: DATE_FORMATS[idioma],
        locale,
        defaultDate: agoraNoMinuto(),
        maxDate: opcoes.maxDate?.(),
        onOpen: opcoes.maxDate ? [() => instance.set('maxDate', opcoes.maxDate?.())] : [],
        onChange: [(datas: Date[]) => {
            input.classList.remove('input-auto');
            opcoes.aoMudar?.(datas[0] ?? null);
        }]
    });

    sincronizarMobileInput(instance);
    registrarPicker(instance);
    return instance;
}

export interface OpcoesDataHoraPicker {
    defaultDate?: Date | null;
    /** Limites calculados a cada abertura (o relógio segue andando). */
    minDate?: () => Date | undefined;
    maxDate?: () => Date | undefined;
    aoMudar?: (data: Date | null) => void;
    /** Mantém o calendário dentro do elemento do campo (necessário dentro de modais, por causa do foco). */
    estatico?: boolean;
}

/** Campo de data e hora comum (sem o comportamento "automático" do campo de retirada). */
export async function criarDataHoraPicker(input: HTMLElement, opcoes: OpcoesDataHoraPicker = {}): Promise<FlatpickrInstance> {
    const idioma = getIdioma() as Idioma;
    const { flatpickr, locale } = await carregarFlatpickr(idioma);

    input.setAttribute('step', '60');

    const aplicarLimites = (): void => {
        instance.set('minDate', opcoes.minDate?.());
        instance.set('maxDate', opcoes.maxDate?.());
    };

    const instance = flatpickr(input, {
        enableTime: true,
        time_24hr: idioma === 'pt',
        dateFormat: DATE_FORMATS[idioma],
        locale,
        static: opcoes.estatico ?? false,
        defaultDate: opcoes.defaultDate ?? undefined,
        minDate: opcoes.minDate?.(),
        maxDate: opcoes.maxDate?.(),
        onOpen: [aplicarLimites],
        onChange: [(datas: Date[]) => opcoes.aoMudar?.(datas[0] ?? null)]
    });

    sincronizarMobileInput(instance);
    return instance;
}

/** Fim do dia local (23:59) de `data`. */
export function fimDoDia(data: Date): Date {
    const d = new Date(data);
    d.setHours(23, 59, 0, 0);
    return d;
}

/** Fonte única de "agora": horário do servidor (ver serverClock), no minuto cheio. */
function agoraNoMinuto(): Date {
    const d = agora();
    d.setSeconds(0, 0);
    return d;
}

const INTERVALO_RELOGIO_MS = 15_000;
const pickersAutomaticos = new Set<FlatpickrInstance>();
let timerRelogio: ReturnType<typeof setInterval> | undefined;

function abaVisivel(): boolean {
    return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

/**
 * Mantém o horário dos campos automáticos (classe input-auto) acompanhando o relógio. Um campo aberto,
 * focado ou já editado pelo usuário (sem input-auto) nunca é sobrescrito.
 */
function atualizarPickersAutomaticos(): void {
    if (!abaVisivel()) return;
    const alvo = agoraNoMinuto().getTime();
    pickersAutomaticos.forEach((picker) => {
        if (!picker.input.isConnected) {
            pickersAutomaticos.delete(picker);
            return;
        }
        if (!picker.input.classList.contains('input-auto')) return;
        if (picker.isOpen) return;
        const foco = document.activeElement;
        if (foco && (foco === picker.mobileInput || foco === picker.input)) return;
        if (picker.selectedDates[0]?.getTime() === alvo) return;
        definirAgora(picker);
    });
}

function registrarPicker(picker: FlatpickrInstance): void {
    pickersAutomaticos.add(picker);
    if (timerRelogio !== undefined) return;
    timerRelogio = setInterval(atualizarPickersAutomaticos, INTERVALO_RELOGIO_MS);
    document.addEventListener('visibilitychange', atualizarPickersAutomaticos);
}

/**
 * No mobile o flatpickr usa um <input type="datetime-local"> nativo, cujo step
 * parte do defaultValue. Mantê-lo sem segundos evita stepMismatch e que
 * form.reset() restaure um valor antigo.
 */
function sincronizarMobileInput(picker: FlatpickrInstance): void {
    const mobile = picker.mobileInput;
    if (mobile) mobile.defaultValue = mobile.value;
}

export function definirAgora(picker: FlatpickrInstance): void {
    picker.setDate(agoraNoMinuto(), false);
    sincronizarMobileInput(picker);
}