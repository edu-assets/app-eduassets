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

export async function criarDataAutoPicker(input: HTMLElement): Promise<FlatpickrInstance> {
    const idioma = getIdioma() as Idioma;
    const { flatpickr, locale } = await carregarFlatpickr(idioma);

    input.setAttribute('step', '60');

    const instance = flatpickr(input, {
        enableTime: true,
        time_24hr: idioma === 'pt',
        dateFormat: DATE_FORMATS[idioma],
        locale,
        defaultDate: agoraNoMinuto(),
        onChange: () => input.classList.remove('input-auto')
    });

    sincronizarMobileInput(instance);
    registrarPicker(instance);
    return instance;
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