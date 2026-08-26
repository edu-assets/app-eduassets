import type Flatpickr from 'flatpickr';
import { getIdioma } from '../state/i18nStore.js';

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

    return flatpickr(input, {
        enableTime: true,
        time_24hr: idioma === 'pt',
        dateFormat: DATE_FORMATS[idioma],
        locale,
        defaultDate: new Date(),
        onChange: () => input.classList.remove('input-auto')
    });
}